package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.controller.NegotiationChatController.OpenChatRequest;
import com.kuraliupdates.bazaar.controller.NegotiationChatController.RespondOfferRequest;
import com.kuraliupdates.bazaar.controller.NegotiationChatController.SendMessageRequest;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class NegotiationChatService {
    private final JdbcTemplate jdbc;
    private final SellerRepository sellerRepository;
    private static final DateTimeFormatter DISPLAY_TIME = DateTimeFormatter.ofPattern("hh:mm a");

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(UserEntity user) {
        String role = normalizeRole(user);
        if ("SELLER".equals(role)) {
            String sellerId = requireSellerId(user.getEmail());
            return jdbc.query("SELECT c.CHAT_ID FROM NEGOTIATION_CHATS c WHERE c.SELLER_ID=? ORDER BY c.LAST_UPDATED DESC",
                    (rs, row) -> rs.getString(1), sellerId).stream().map(this::getChatForKnownParticipant).toList();
        }
        if (!"BUYER".equals(role)) throw new ApiException(HttpStatus.FORBIDDEN, "Only buyers and sellers can access bargaining chat");
        String email = normalizeEmail(user.getEmail());
        if (email.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "A verified email is required for bargaining chat");
        return jdbc.query("SELECT c.CHAT_ID FROM NEGOTIATION_CHATS c WHERE LOWER(c.BUYER_EMAIL)=? ORDER BY c.LAST_UPDATED DESC",
                (rs, row) -> rs.getString(1), email).stream().map(this::getChatForKnownParticipant).toList();
    }

    @Transactional
    public Map<String, Object> open(UserEntity user, OpenChatRequest request) {
        requireBuyer(user);
        if (request == null || blank(request.productId())) throw new ApiException(HttpStatus.BAD_REQUEST, "Product is required");
        String email = normalizeEmail(user.getEmail());
        if (email.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "A verified email is required for bargaining chat");
        Map<String, Object> product = jdbc.query("SELECT p.PRODUCT_ID,p.TITLE,p.IMAGE_URL,p.SELLER_ID,p.SELLER_PRICE,p.EFFECTIVE_PRICE,s.STORE_NAME,s.STATUS,s.LOCALITY FROM PRODUCTS p JOIN SELLERS s ON s.SELLER_ID=p.SELLER_ID WHERE p.PRODUCT_ID=?",
                rs -> rs.next() ? productMap(rs) : null, request.productId().trim());
        if (product == null) throw new ApiException(HttpStatus.NOT_FOUND, "Product not found");
        if (!"APPROVED".equalsIgnoreCase(Objects.toString(product.get("sellerStatus"), ""))) throw new ApiException(HttpStatus.CONFLICT, "This seller is not currently approved");
        String sellerId = Objects.toString(product.get("sellerId"));
        List<String> existing = jdbc.query("SELECT CHAT_ID FROM NEGOTIATION_CHATS WHERE PRODUCT_ID=? AND SELLER_ID=? AND LOWER(BUYER_EMAIL)=?",
                (rs, row) -> rs.getString(1), request.productId().trim(), sellerId, email);
        if (!existing.isEmpty()) return getChatForKnownParticipant(existing.get(0));

        String chatId = "chat-" + UUID.randomUUID();
        BigDecimal listPrice = (BigDecimal) product.get("sellerPrice");
        BigDecimal offerPrice = request.startingOfferPrice() == null ? listPrice.multiply(new BigDecimal("0.90")).setScale(2, java.math.RoundingMode.HALF_UP) : request.startingOfferPrice();
        validatePrice(offerPrice, listPrice);
        jdbc.update("INSERT INTO NEGOTIATION_CHATS (CHAT_ID,PRODUCT_ID,SELLER_ID,BUYER_NAME,BUYER_EMAIL,LAST_UPDATED) VALUES (?,?,?,?,?,?)",
                chatId, request.productId().trim(), sellerId, safeName(user.getName(), "Buyer"), email, Timestamp.valueOf(LocalDateTime.now()));
        insertMessage(chatId, "BUYER", safeName(user.getName(), "Buyer"),
                blank(request.openingMessage()) ? "Hi, I'm interested in " + product.get("productTitle") + ". Can you offer a better price?" : request.openingMessage().trim(),
                offerPrice, "PENDING");
        return getChatForKnownParticipant(chatId);
    }

    @Transactional
    public Map<String, Object> send(UserEntity user, String chatId, SendMessageRequest request) {
        if (request == null || (blank(request.text()) && request.offerPrice() == null)) throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a message or price offer");
        Map<String, Object> chat = requireChatParticipant(user, chatId, true);
        String role = normalizeRole(user);
        BigDecimal offerPrice = request.offerPrice();
        if (offerPrice != null) {
            BigDecimal original = (BigDecimal) chat.get("originalPrice");
            validatePrice(offerPrice, original);
        }
        insertMessage(chatId, role, safeName(user.getName(), role.equals("SELLER") ? "Seller" : "Buyer"),
                blank(request.text()) ? "Price offer: ₹" + offerPrice : request.text().trim(), offerPrice, offerPrice == null ? null : "PENDING");
        jdbc.update("UPDATE NEGOTIATION_CHATS SET LAST_UPDATED=? WHERE CHAT_ID=?", Timestamp.valueOf(LocalDateTime.now()), chatId);
        return getChatForKnownParticipant(chatId);
    }

    @Transactional
    public Map<String, Object> respond(UserEntity user, String chatId, String offerId, RespondOfferRequest request) {
        if (request == null || request.action() == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Offer response is required");
        Map<String, Object> chat = requireChatParticipant(user, chatId, true);
        String role = normalizeRole(user);
        String action = request.action().trim().toUpperCase(Locale.ROOT);
        if (!List.of("ACCEPT", "REJECT", "COUNTER").contains(action)) throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported offer action");
        List<Map<String, Object>> rows = jdbc.query("SELECT MESSAGE_ID,SENDER_ROLE,OFFER_PRICE,OFFER_STATUS FROM CHAT_MESSAGES WHERE CHAT_ID=? AND MESSAGE_ID=? FOR UPDATE",
                (rs, row) -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", rs.getString("MESSAGE_ID")); item.put("senderRole", rs.getString("SENDER_ROLE"));
                    item.put("price", rs.getBigDecimal("OFFER_PRICE")); item.put("status", rs.getString("OFFER_STATUS")); return item;
                }, chatId, offerId);
        if (rows.isEmpty() || rows.get(0).get("price") == null) throw new ApiException(HttpStatus.NOT_FOUND, "Offer not found");
        Map<String, Object> offer = rows.get(0);
        if (!"PENDING".equalsIgnoreCase(Objects.toString(offer.get("status"), ""))) throw new ApiException(HttpStatus.CONFLICT, "This offer has already been answered");
        String sender = Objects.toString(offer.get("senderRole"), "").toUpperCase(Locale.ROOT);
        if (sender.equals(role)) throw new ApiException(HttpStatus.FORBIDDEN, "You cannot respond to your own offer");
        BigDecimal acceptedPrice = (BigDecimal) offer.get("price");
        if ("COUNTER".equals(action)) {
            validatePrice(request.counterPrice(), (BigDecimal) chat.get("originalPrice"));
            jdbc.update("UPDATE CHAT_MESSAGES SET OFFER_STATUS='COUNTERED' WHERE MESSAGE_ID=? AND CHAT_ID=?", offerId, chatId);
            insertMessage(chatId, role, safeName(user.getName(), role.equals("SELLER") ? "Seller" : "Buyer"),
                    "Counter offer: ₹" + request.counterPrice(), request.counterPrice(), "PENDING");
        } else if ("ACCEPT".equals(action)) {
            jdbc.update("UPDATE CHAT_MESSAGES SET OFFER_STATUS='ACCEPTED' WHERE MESSAGE_ID=? AND CHAT_ID=?", offerId, chatId);
            jdbc.update("UPDATE NEGOTIATION_CHATS SET CURRENT_AGREED_PRICE=?, LAST_UPDATED=? WHERE CHAT_ID=?",
                    acceptedPrice, Timestamp.valueOf(LocalDateTime.now()), chatId);
            insertMessage(chatId, role, safeName(user.getName(), role.equals("SELLER") ? "Seller" : "Buyer"),
                    "Offer accepted. Agreed item price: ₹" + acceptedPrice, null, null);
        } else {
            jdbc.update("UPDATE CHAT_MESSAGES SET OFFER_STATUS='REJECTED' WHERE MESSAGE_ID=? AND CHAT_ID=?", offerId, chatId);
            insertMessage(chatId, role, safeName(user.getName(), role.equals("SELLER") ? "Seller" : "Buyer"), "Offer declined. Standard price applies.", null, null);
        }
        jdbc.update("UPDATE NEGOTIATION_CHATS SET LAST_UPDATED=? WHERE CHAT_ID=?", Timestamp.valueOf(LocalDateTime.now()), chatId);
        return getChatForKnownParticipant(chatId);
    }

    private Map<String, Object> requireChatParticipant(UserEntity user, String chatId, boolean write) {
        String role = normalizeRole(user);
        if (!"BUYER".equals(role) && !"SELLER".equals(role)) throw new ApiException(HttpStatus.FORBIDDEN, "Only buyers and sellers can use bargaining chat");
        List<Map<String, Object>> rows = jdbc.query("SELECT c.CHAT_ID,c.PRODUCT_ID,c.SELLER_ID,c.BUYER_NAME,c.BUYER_EMAIL,c.CURRENT_AGREED_PRICE,c.LAST_UPDATED,p.TITLE,p.IMAGE_URL,p.SELLER_PRICE,p.EFFECTIVE_PRICE,s.STORE_NAME,s.STATUS AS SELLER_STATUS,s.LOCALITY,(SELECT MAX(m.MESSAGE_ID) KEEP (DENSE_RANK LAST ORDER BY m.CREATED_AT) FROM CHAT_MESSAGES m WHERE m.CHAT_ID=c.CHAT_ID AND m.OFFER_STATUS='ACCEPTED') AS ACCEPTED_OFFER_ID FROM NEGOTIATION_CHATS c JOIN PRODUCTS p ON p.PRODUCT_ID=c.PRODUCT_ID JOIN SELLERS s ON s.SELLER_ID=c.SELLER_ID WHERE c.CHAT_ID=?",
                (rs, row) -> chatMap(rs), chatId);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Conversation not found");
        Map<String, Object> chat = rows.get(0);
        if ("BUYER".equals(role) && !normalizeEmail(user.getEmail()).equals(normalizeEmail(Objects.toString(chat.get("buyerEmail"), "")))) throw new ApiException(HttpStatus.FORBIDDEN, "This conversation does not belong to your buyer account");
        if ("SELLER".equals(role) && !requireSellerId(user.getEmail()).equals(Objects.toString(chat.get("sellerId"), ""))) throw new ApiException(HttpStatus.FORBIDDEN, "This conversation does not belong to your store");
        if ("SELLER".equals(role) && !"APPROVED".equalsIgnoreCase(Objects.toString(chat.get("sellerStatus"), ""))) throw new ApiException(HttpStatus.FORBIDDEN, "Only approved sellers can respond to bargaining offers");
        return chat;
    }

    private Map<String, Object> getChatForKnownParticipant(String chatId) {
        List<Map<String, Object>> rows = jdbc.query("SELECT c.CHAT_ID,c.PRODUCT_ID,c.SELLER_ID,c.BUYER_NAME,c.BUYER_EMAIL,c.CURRENT_AGREED_PRICE,p.TITLE,p.IMAGE_URL,p.SELLER_PRICE,p.EFFECTIVE_PRICE,s.STORE_NAME,s.STATUS AS SELLER_STATUS,s.LOCALITY FROM NEGOTIATION_CHATS c JOIN PRODUCTS p ON p.PRODUCT_ID=c.PRODUCT_ID JOIN SELLERS s ON s.SELLER_ID=c.SELLER_ID WHERE c.CHAT_ID=?",
                (rs, row) -> chatMap(rs), chatId);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Conversation not found");
        Map<String, Object> chat = rows.get(0);
        List<Map<String, Object>> messages = jdbc.query("SELECT MESSAGE_ID,CHAT_ID,SENDER_ROLE,SENDER_NAME,MESSAGE_TEXT,OFFER_PRICE,OFFER_STATUS,CREATED_AT FROM CHAT_MESSAGES WHERE CHAT_ID=? ORDER BY CREATED_AT ASC, MESSAGE_ID ASC",
                (rs, row) -> messageMap(rs, chat), chatId);
        chat.put("messages", messages);
        return chat;
    }

    private Map<String, Object> chatMap(ResultSet rs) throws SQLException {
        Map<String, Object> chat = new LinkedHashMap<>();
        String id = rs.getString("CHAT_ID");
        chat.put("id", id); chat.put("productId", rs.getString("PRODUCT_ID"));
        chat.put("productTitle", rs.getString("TITLE")); chat.put("productImage", rs.getString("IMAGE_URL"));
        chat.put("sellerId", rs.getString("SELLER_ID")); chat.put("sellerName", rs.getString("STORE_NAME"));
        chat.put("sellerStatus", rs.getString("SELLER_STATUS")); chat.put("sellerLocality", rs.getString("LOCALITY"));
        chat.put("buyerName", rs.getString("BUYER_NAME")); chat.put("buyerEmail", rs.getString("BUYER_EMAIL"));
        chat.put("currentAgreedPrice", rs.getBigDecimal("CURRENT_AGREED_PRICE")); chat.put("currentAgreedOfferId", rs.getString("ACCEPTED_OFFER_ID"));
        chat.put("originalPrice", rs.getBigDecimal("SELLER_PRICE"));
        Timestamp updated = rs.getTimestamp("LAST_UPDATED");
        chat.put("lastUpdated", updated == null ? "" : updated.toLocalDateTime().format(DISPLAY_TIME));
        return chat;
    }

    private Map<String, Object> messageMap(ResultSet rs, Map<String, Object> chat) throws SQLException {
        Map<String, Object> message = new LinkedHashMap<>();
        String id = rs.getString("MESSAGE_ID");
        String role = rs.getString("SENDER_ROLE").toLowerCase(Locale.ROOT);
        BigDecimal offerPrice = rs.getBigDecimal("OFFER_PRICE");
        String status = rs.getString("OFFER_STATUS");
        Timestamp created = rs.getTimestamp("CREATED_AT");
        message.put("id", id); message.put("chatId", rs.getString("CHAT_ID")); message.put("senderRole", role);
        message.put("senderName", rs.getString("SENDER_NAME")); message.put("text", rs.getString("MESSAGE_TEXT"));
        message.put("timestamp", created == null ? "" : created.toLocalDateTime().format(DISPLAY_TIME));
        if (offerPrice != null) {
            Map<String, Object> offer = new LinkedHashMap<>();
            offer.put("id", id); offer.put("productId", chat.get("productId")); offer.put("productTitle", chat.get("productTitle"));
            offer.put("productImage", chat.get("productImage")); offer.put("originalPrice", chat.get("originalPrice"));
            offer.put("offeredPrice", offerPrice); offer.put("senderRole", role); offer.put("quantity", 1);
            offer.put("status", status == null ? "pending" : status.toLowerCase(Locale.ROOT));
            message.put("offer", offer);
        }
        return message;
    }

    private Map<String, Object> productMap(ResultSet rs) throws SQLException {
        Map<String, Object> p = new HashMap<>();
        p.put("productId", rs.getString("PRODUCT_ID")); p.put("productTitle", rs.getString("TITLE"));
        p.put("productImage", rs.getString("IMAGE_URL")); p.put("sellerId", rs.getString("SELLER_ID"));
        p.put("sellerPrice", rs.getBigDecimal("SELLER_PRICE")); p.put("effectivePrice", rs.getBigDecimal("EFFECTIVE_PRICE"));
        p.put("sellerName", rs.getString("STORE_NAME")); p.put("sellerStatus", rs.getString("STATUS")); p.put("locality", rs.getString("LOCALITY"));
        return p;
    }

    private void insertMessage(String chatId, String role, String name, String text, BigDecimal offerPrice, String status) {
        jdbc.update("INSERT INTO CHAT_MESSAGES (MESSAGE_ID,CHAT_ID,SENDER_ROLE,SENDER_NAME,MESSAGE_TEXT,OFFER_PRICE,OFFER_STATUS,CREATED_AT) VALUES (?,?,?,?,?,?,?,?)",
                "msg-" + UUID.randomUUID(), chatId, role, name, text, offerPrice, status, Timestamp.valueOf(LocalDateTime.now()));
    }

    private String requireSellerId(String email) {
        if (blank(email)) throw new ApiException(HttpStatus.FORBIDDEN, "Seller account email is required");
        return sellerRepository.findByEmailIgnoreCase(email.trim()).filter(s -> "APPROVED".equalsIgnoreCase(s.getStatus()))
                .map(s -> s.getSellerId()).orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Approved seller store not found"));
    }
    private void requireBuyer(UserEntity user) {
        if (!"BUYER".equals(normalizeRole(user))) throw new ApiException(HttpStatus.FORBIDDEN, "Only buyer accounts can start a conversation");
    }
    private String normalizeRole(UserEntity user) { return user.getRole() == null ? "BUYER" : user.getRole().trim().toUpperCase(Locale.ROOT); }
    private String normalizeEmail(String email) { return email == null ? "" : email.trim().toLowerCase(Locale.ROOT); }
    private boolean blank(String value) { return value == null || value.isBlank(); }
    private String safeName(String name, String fallback) { return blank(name) ? fallback : name.trim().substring(0, Math.min(150, name.trim().length())); }
    private void validatePrice(BigDecimal price, BigDecimal original) {
        if (price == null || price.signum() <= 0 || price.scale() > 2) throw new ApiException(HttpStatus.BAD_REQUEST, "Offer price must be a positive amount with at most two decimal places");
        if (original == null || price.compareTo(original.multiply(new BigDecimal("2"))) > 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Offer price is outside the allowed range");
    }
}

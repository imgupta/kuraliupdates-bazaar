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

    @Transactional
    public List<Map<String, Object>> list(UserEntity user, String requestedRole) {
        String role = normalizeActiveRole(requestedRole);
        if ("SELLER".equals(role)) {
            String sellerIdForExpiry = requireSellerId(user.getEmail());
            jdbc.update("UPDATE NEGOTIATION_CHATS SET BARGAIN_STATUS='EXPIRED', CLOSED_AT=CURRENT_TIMESTAMP, CURRENT_AGREED_PRICE=NULL WHERE SELLER_ID=? AND BARGAIN_STATUS IN ('PENDING_SELLER','PENDING_BUYER') AND EXPIRES_AT<=CURRENT_TIMESTAMP", sellerIdForExpiry);
            String sellerId = requireSellerId(user.getEmail());
            return jdbc.query("SELECT c.CHAT_ID FROM NEGOTIATION_CHATS c WHERE c.SELLER_ID=? ORDER BY c.LAST_UPDATED DESC",
                    (rs, row) -> rs.getString(1), sellerId).stream().map(this::getChatForKnownParticipant).toList();
        }
        if (!"BUYER".equals(role)) throw new ApiException(HttpStatus.FORBIDDEN, "Only buyers and sellers can access bargaining chat");
        String email = normalizeEmail(user.getEmail());
        if (email.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "A verified email is required for bargaining chat");
        jdbc.update("UPDATE NEGOTIATION_CHATS SET BARGAIN_STATUS='EXPIRED', CLOSED_AT=CURRENT_TIMESTAMP, CURRENT_AGREED_PRICE=NULL WHERE LOWER(BUYER_EMAIL)=? AND BARGAIN_STATUS IN ('PENDING_SELLER','PENDING_BUYER') AND EXPIRES_AT<=CURRENT_TIMESTAMP", email);
        return jdbc.query("SELECT c.CHAT_ID FROM NEGOTIATION_CHATS c WHERE LOWER(c.BUYER_EMAIL)=? ORDER BY c.LAST_UPDATED DESC",
                (rs, row) -> rs.getString(1), email).stream().map(this::getChatForKnownParticipant).toList();
    }

    @Transactional
    public Map<String, Object> open(UserEntity user, OpenChatRequest request) {
        return open(user, request, null);
    }

    @Transactional
    public Map<String, Object> open(UserEntity user, OpenChatRequest request, String e2eRunId) {
        requireBuyer(user);
        if (request == null || blank(request.productId())) throw new ApiException(HttpStatus.BAD_REQUEST, "Product is required");
        if (!blank(request.openingMessage()) && request.openingMessage().length() > 1000) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Opening message must be 1000 characters or fewer");
        }
        String email = normalizeEmail(user.getEmail());
        if (email.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "A verified email is required for bargaining chat");
        // Serialize concurrent conversation creation for the same product. The
        // product row is the shared lock, so rapid double-clicks cannot create
        // duplicate buyer/product conversations even without a schema constraint.
        Map<String, Object> product = jdbc.query("SELECT p.PRODUCT_ID,p.TITLE,p.IMAGE_URL,p.SELLER_ID,p.SELLER_PRICE,p.EFFECTIVE_PRICE,s.STORE_NAME,s.STATUS,s.LOCALITY FROM PRODUCTS p JOIN SELLERS s ON s.SELLER_ID=p.SELLER_ID WHERE p.PRODUCT_ID=? FOR UPDATE OF p.PRODUCT_ID",
                rs -> rs.next() ? productMap(rs) : null, request.productId().trim());
        if (product == null) throw new ApiException(HttpStatus.NOT_FOUND, "Product not found");
        if (!"APPROVED".equalsIgnoreCase(Objects.toString(product.get("sellerStatus"), ""))) throw new ApiException(HttpStatus.CONFLICT, "This seller is not currently approved");
        String sellerId = Objects.toString(product.get("sellerId"));
        List<String> existing = jdbc.query("SELECT CHAT_ID FROM NEGOTIATION_CHATS WHERE PRODUCT_ID=? AND SELLER_ID=? AND LOWER(BUYER_EMAIL)=?",
                (rs, row) -> rs.getString(1), request.productId().trim(), sellerId, email);
        if (!existing.isEmpty()) {
            if (e2eRunId != null) {
                String existingRunId = jdbc.queryForObject(
                        "SELECT E2E_RUN_ID FROM NEGOTIATION_CHATS WHERE CHAT_ID = ?",
                        String.class, existing.get(0));
                if (!e2eRunId.equals(existingRunId)) {
                    throw new ApiException(HttpStatus.CONFLICT,
                            "A prior conversation exists for this synthetic buyer/product; refusing to reuse an untagged or other-run record");
                }
            }
            return getChatForKnownParticipant(existing.get(0));
        }

        String chatId = "chat-" + UUID.randomUUID();
        BigDecimal listPrice = (BigDecimal) product.get("effectivePrice");
        if (listPrice == null) listPrice = (BigDecimal) product.get("sellerPrice");
        BigDecimal offerPrice = request.startingOfferPrice() == null ? listPrice.multiply(new BigDecimal("0.90")).setScale(2, java.math.RoundingMode.HALF_UP) : request.startingOfferPrice();
        validatePrice(offerPrice, listPrice);
        jdbc.update("INSERT INTO NEGOTIATION_CHATS (CHAT_ID,PRODUCT_ID,SELLER_ID,BUYER_NAME,BUYER_EMAIL,BARGAIN_STATUS,EXPIRES_AT,LAST_UPDATED,E2E_RUN_ID) VALUES (?,?,?,?,?,'PENDING_SELLER',?,?,?)",
                chatId, request.productId().trim(), sellerId, safeName(user.getName(), "Buyer"), email, Timestamp.valueOf(LocalDateTime.now().plusHours(24)), Timestamp.valueOf(LocalDateTime.now()), e2eRunId);
        insertMessage(chatId, "BUYER", safeName(user.getName(), "Buyer"),
                blank(request.openingMessage()) ? "Hi, I'm interested in " + product.get("productTitle") + ". Can you offer a better price?" : request.openingMessage().trim(),
                offerPrice, "PENDING");
        notifyParticipant(chatId, sellerEmail(sellerId), "SELLER", "NEW_OFFER", "A buyer sent you a price offer.");
        return getChatForKnownParticipant(chatId);
    }

    @Transactional
    public Map<String, Object> send(UserEntity user, String requestedRole, String chatId, SendMessageRequest request) {
        if (request == null || (blank(request.text()) && request.offerPrice() == null)) throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a message or price offer");
        if (!blank(request.text()) && request.text().length() > 2000) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Message must be 2000 characters or fewer");
        }
        String role = normalizeActiveRole(requestedRole);
        Map<String, Object> chat = requireChatParticipant(user, role, chatId);
        Map<String, Object> lockedLifecycle = jdbc.queryForMap("SELECT BARGAIN_STATUS, EXPIRES_AT FROM NEGOTIATION_CHATS WHERE CHAT_ID=? FOR UPDATE", chatId);
        String lifecycle = Objects.toString(lockedLifecycle.get("BARGAIN_STATUS"), "");
        Timestamp expiry = (Timestamp) lockedLifecycle.get("EXPIRES_AT");
        if ("CLOSED_PURCHASED".equalsIgnoreCase(lifecycle)) {
            throw new ApiException(HttpStatus.CONFLICT, "This bargain is closed because the item was already purchased.");
        }
        if (expiry != null && expiry.toLocalDateTime().isBefore(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.CONFLICT, "This bargain has expired. The catalogue price applies.");
        }
        BigDecimal offerPrice = request.offerPrice();
        if (offerPrice != null && "ACCEPTED".equalsIgnoreCase(lifecycle)) {
            throw new ApiException(HttpStatus.CONFLICT, "This bargain has already been accepted. Start a new conversation for another negotiation.");
        }
        if (offerPrice != null) {
            BigDecimal original = (BigDecimal) chat.get("originalPrice");
            validatePrice(offerPrice, original);
        }
        insertMessage(chatId, role, safeName(user.getName(), role.equals("SELLER") ? "Seller" : "Buyer"),
                blank(request.text()) ? "Price offer: ₹" + offerPrice : request.text().trim(), offerPrice, offerPrice == null ? null : "PENDING");
        if (offerPrice != null) {
            String nextStatus = "SELLER".equals(role) ? "PENDING_BUYER" : "PENDING_SELLER";
            jdbc.update("UPDATE NEGOTIATION_CHATS SET BARGAIN_STATUS=?, EXPIRES_AT=?, LAST_UPDATED=? WHERE CHAT_ID=?",
                    nextStatus, Timestamp.valueOf(LocalDateTime.now().plusHours(24)), Timestamp.valueOf(LocalDateTime.now()), chatId);
            String recipient = "SELLER".equals(role) ? normalizeEmail(Objects.toString(chat.get("buyerEmail"), "")) : sellerEmail(Objects.toString(chat.get("sellerId"), ""));
            notifyParticipant(chatId, recipient, "SELLER".equals(role) ? "BUYER" : "SELLER", "COUNTER_OFFER", "A new counter-offer is waiting for your response.");
        } else {
            jdbc.update("UPDATE NEGOTIATION_CHATS SET LAST_UPDATED=? WHERE CHAT_ID=?", Timestamp.valueOf(LocalDateTime.now()), chatId);
        }
        return getChatForKnownParticipant(chatId);
    }

    @Transactional
    public Map<String, Object> respond(UserEntity user, String requestedRole, String chatId, String offerId, RespondOfferRequest request) {
        if (request == null || request.action() == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Offer response is required");
        String role = normalizeActiveRole(requestedRole);
        String action = request.action().trim().toUpperCase(Locale.ROOT);
        if (!List.of("ACCEPT", "REJECT", "COUNTER").contains(action)) throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported offer action");
        Map<String, Object> chat = requireChatParticipant(user, role, chatId);
        Map<String, Object> lockedLifecycle = jdbc.queryForMap("SELECT BARGAIN_STATUS, EXPIRES_AT FROM NEGOTIATION_CHATS WHERE CHAT_ID=? FOR UPDATE", chatId);
        chat.put("bargainStatus", lockedLifecycle.get("BARGAIN_STATUS"));
        chat.put("expiresAt", lockedLifecycle.get("EXPIRES_AT"));
        if ("CLOSED_PURCHASED".equalsIgnoreCase(Objects.toString(chat.get("bargainStatus"), ""))) {
            throw new ApiException(HttpStatus.CONFLICT, "This bargain was closed by checkout and can no longer be accepted.");
        }
        if ("EXPIRED".equalsIgnoreCase(Objects.toString(chat.get("bargainStatus"), ""))
                || (chat.get("expiresAt") instanceof Timestamp expiry && expiry.toLocalDateTime().isBefore(LocalDateTime.now()))) {
            jdbc.update("UPDATE NEGOTIATION_CHATS SET BARGAIN_STATUS='EXPIRED', CLOSED_AT=?, CURRENT_AGREED_PRICE=NULL WHERE CHAT_ID=? AND BARGAIN_STATUS IN ('PENDING_SELLER','PENDING_BUYER')",
                    Timestamp.valueOf(LocalDateTime.now()), chatId);
            throw new ApiException(HttpStatus.CONFLICT, "This bargain has expired. The catalogue price applies.");
        }
        // Serialize offer decisions per conversation. Locking only the selected offer
        // allows two different pending offers in the same chat to be accepted concurrently.
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
            String nextStatus = "SELLER".equals(role) ? "PENDING_BUYER" : "PENDING_SELLER";
            jdbc.update("UPDATE NEGOTIATION_CHATS SET BARGAIN_STATUS=?, EXPIRES_AT=?, CURRENT_AGREED_PRICE=NULL, LAST_UPDATED=? WHERE CHAT_ID=?",
                    nextStatus, Timestamp.valueOf(LocalDateTime.now().plusHours(24)), Timestamp.valueOf(LocalDateTime.now()), chatId);
            notifyOtherParticipant(chat, role, "COUNTER_OFFER", "A new counter-offer is waiting for your response.");
        } else if ("ACCEPT".equals(action)) {
            jdbc.update("UPDATE CHAT_MESSAGES SET OFFER_STATUS='ACCEPTED' WHERE MESSAGE_ID=? AND CHAT_ID=?", offerId, chatId);
            jdbc.update("UPDATE CHAT_MESSAGES SET OFFER_STATUS='REJECTED' WHERE CHAT_ID=? AND OFFER_PRICE IS NOT NULL AND OFFER_STATUS='PENDING' AND MESSAGE_ID<>?", chatId, offerId);
            jdbc.update("UPDATE NEGOTIATION_CHATS SET CURRENT_AGREED_PRICE=?, BARGAIN_STATUS='ACCEPTED', EXPIRES_AT=NULL, CLOSED_AT=?, LAST_UPDATED=? WHERE CHAT_ID=?",
                    acceptedPrice, Timestamp.valueOf(LocalDateTime.now()), Timestamp.valueOf(LocalDateTime.now()), chatId);
            insertMessage(chatId, role, safeName(user.getName(), role.equals("SELLER") ? "Seller" : "Buyer"),
                    "Offer accepted. Agreed item price: ₹" + acceptedPrice, null, null);
            notifyOtherParticipant(chat, role, "OFFER_ACCEPTED", "Your bargain was accepted at ₹" + acceptedPrice + ". The negotiated price is now available in your cart.");
        } else {
            jdbc.update("UPDATE CHAT_MESSAGES SET OFFER_STATUS='REJECTED' WHERE CHAT_ID=? AND OFFER_STATUS='PENDING'", chatId);
            jdbc.update("UPDATE NEGOTIATION_CHATS SET BARGAIN_STATUS='REJECTED', CURRENT_AGREED_PRICE=NULL, EXPIRES_AT=NULL, CLOSED_AT=? WHERE CHAT_ID=?",
                    Timestamp.valueOf(LocalDateTime.now()), chatId);
            insertMessage(chatId, role, safeName(user.getName(), role.equals("SELLER") ? "Seller" : "Buyer"), "Offer declined. Standard price applies.", null, null);
            notifyOtherParticipant(chat, role, "OFFER_REJECTED", "Your bargain was declined. You can still buy at the current catalogue price.");
        }
        jdbc.update("UPDATE NEGOTIATION_CHATS SET LAST_UPDATED=? WHERE CHAT_ID=?", Timestamp.valueOf(LocalDateTime.now()), chatId);
        return getChatForKnownParticipant(chatId);
    }

    private Map<String, Object> requireChatParticipant(UserEntity user, String role, String chatId) {
        if (!"BUYER".equals(role) && !"SELLER".equals(role)) throw new ApiException(HttpStatus.FORBIDDEN, "Only buyers and sellers can use bargaining chat");
        List<Map<String, Object>> rows = jdbc.query("SELECT c.CHAT_ID,c.PRODUCT_ID,c.SELLER_ID,c.BUYER_NAME,c.BUYER_EMAIL,c.CURRENT_AGREED_PRICE,c.BARGAIN_STATUS,c.EXPIRES_AT,c.LAST_UPDATED,p.TITLE,p.IMAGE_URL,p.SELLER_PRICE,p.EFFECTIVE_PRICE,s.STORE_NAME,s.STATUS AS SELLER_STATUS,s.LOCALITY,(SELECT MAX(m.MESSAGE_ID) KEEP (DENSE_RANK LAST ORDER BY m.CREATED_AT) FROM CHAT_MESSAGES m WHERE m.CHAT_ID=c.CHAT_ID AND m.OFFER_STATUS='ACCEPTED') AS ACCEPTED_OFFER_ID FROM NEGOTIATION_CHATS c JOIN PRODUCTS p ON p.PRODUCT_ID=c.PRODUCT_ID JOIN SELLERS s ON s.SELLER_ID=c.SELLER_ID WHERE c.CHAT_ID=?",
                (rs, row) -> chatMap(rs), chatId);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Conversation not found");
        Map<String, Object> chat = rows.get(0);
        if ("BUYER".equals(role) && !normalizeEmail(user.getEmail()).equals(normalizeEmail(Objects.toString(chat.get("buyerEmail"), "")))) throw new ApiException(HttpStatus.FORBIDDEN, "This conversation does not belong to your buyer account");
        if ("SELLER".equals(role) && !requireSellerId(user.getEmail()).equals(Objects.toString(chat.get("sellerId"), ""))) throw new ApiException(HttpStatus.FORBIDDEN, "This conversation does not belong to your store");
        if ("SELLER".equals(role) && !"APPROVED".equalsIgnoreCase(Objects.toString(chat.get("sellerStatus"), ""))) throw new ApiException(HttpStatus.FORBIDDEN, "Only approved sellers can respond to bargaining offers");
        return chat;
    }

    private Map<String, Object> getChatForKnownParticipant(String chatId) {
        List<Map<String, Object>> rows = jdbc.query("SELECT c.CHAT_ID,c.PRODUCT_ID,c.SELLER_ID,c.BUYER_NAME,c.BUYER_EMAIL,c.CURRENT_AGREED_PRICE,c.LAST_UPDATED,p.TITLE,p.IMAGE_URL,p.SELLER_PRICE,p.EFFECTIVE_PRICE,s.STORE_NAME,s.STATUS AS SELLER_STATUS,s.LOCALITY,(SELECT MAX(m.MESSAGE_ID) KEEP (DENSE_RANK LAST ORDER BY m.CREATED_AT) FROM CHAT_MESSAGES m WHERE m.CHAT_ID=c.CHAT_ID AND m.OFFER_STATUS='ACCEPTED') AS ACCEPTED_OFFER_ID FROM NEGOTIATION_CHATS c JOIN PRODUCTS p ON p.PRODUCT_ID=c.PRODUCT_ID JOIN SELLERS s ON s.SELLER_ID=c.SELLER_ID WHERE c.CHAT_ID=?",
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
        chat.put("bargainStatus", rs.getString("BARGAIN_STATUS")); chat.put("expiresAt", rs.getTimestamp("EXPIRES_AT"));
        BigDecimal effectivePrice = rs.getBigDecimal("EFFECTIVE_PRICE");
        chat.put("originalPrice", effectivePrice == null ? rs.getBigDecimal("SELLER_PRICE") : effectivePrice);
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

    @Transactional(readOnly = true)
    public List<Map<String, Object>> notifications(UserEntity user, String requestedRole) {
        String role = normalizeActiveRole(requestedRole);
        String recipient = "SELLER".equals(role) ? sellerEmail(requireSellerId(user.getEmail())) : normalizeEmail(user.getEmail());
        if (blank(recipient)) throw new ApiException(HttpStatus.UNAUTHORIZED, "A verified account is required");
        return jdbc.query("SELECT NOTIFICATION_ID, CHAT_ID, EVENT_TYPE, MESSAGE_TEXT, CREATED_AT FROM BARGAIN_NOTIFICATIONS WHERE LOWER(RECIPIENT_EMAIL)=? AND RECIPIENT_ROLE=? AND IS_READ=0 ORDER BY CREATED_AT DESC",
                (rs, row) -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", rs.getString("NOTIFICATION_ID"));
                    item.put("chatId", rs.getString("CHAT_ID"));
                    item.put("eventType", rs.getString("EVENT_TYPE"));
                    item.put("message", rs.getString("MESSAGE_TEXT"));
                    Timestamp created = rs.getTimestamp("CREATED_AT");
                    item.put("createdAt", created == null ? "" : created.toLocalDateTime().toString());
                    return item;
                }, recipient, role);
    }

    @Transactional
    public void markNotificationRead(UserEntity user, String requestedRole, String notificationId) {
        String role = normalizeActiveRole(requestedRole);
        String recipient = "SELLER".equals(role) ? sellerEmail(requireSellerId(user.getEmail())) : normalizeEmail(user.getEmail());
        if (blank(recipient)) throw new ApiException(HttpStatus.UNAUTHORIZED, "A verified account is required");
        jdbc.update("UPDATE BARGAIN_NOTIFICATIONS SET IS_READ=1, READ_AT=CURRENT_TIMESTAMP WHERE NOTIFICATION_ID=? AND LOWER(RECIPIENT_EMAIL)=? AND RECIPIENT_ROLE=?",
                notificationId, recipient, role);
    }

    private void notifyOtherParticipant(Map<String, Object> chat, String actingRole, String event, String message) {
        String recipient = "SELLER".equals(actingRole)
                ? normalizeEmail(Objects.toString(chat.get("buyerEmail"), ""))
                : sellerEmail(Objects.toString(chat.get("sellerId"), ""));
        notifyParticipant(Objects.toString(chat.get("id"), ""), recipient,
                "SELLER".equals(actingRole) ? "BUYER" : "SELLER", event, message);
    }

    private String sellerEmail(String sellerId) {
        if (blank(sellerId)) return "";
        return sellerRepository.findById(sellerId).map(seller -> normalizeEmail(seller.getEmail())).orElse("");
    }

    private void notifyParticipant(String chatId, String recipient, String recipientRole, String event, String message) {
        if (blank(chatId) || blank(recipient)) return;
        jdbc.update("INSERT INTO BARGAIN_NOTIFICATIONS (NOTIFICATION_ID,CHAT_ID,RECIPIENT_EMAIL,RECIPIENT_ROLE,EVENT_TYPE,MESSAGE_TEXT,IS_READ,CREATED_AT) VALUES (?,?,?,?,?,?,0,?)",
                "bn-" + UUID.randomUUID(), chatId, recipient, recipientRole, event, message, Timestamp.valueOf(LocalDateTime.now()));
    }

    private String requireSellerId(String email) {
        if (blank(email)) throw new ApiException(HttpStatus.FORBIDDEN, "Seller account email is required");
        return sellerRepository.findByEmailIgnoreCase(email.trim()).filter(s -> "APPROVED".equalsIgnoreCase(s.getStatus()))
                .map(s -> s.getSellerId()).orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Approved seller store not found"));
    }
    private void requireBuyer(UserEntity user) {
        if (user == null || blank(user.getUserId())) throw new ApiException(HttpStatus.UNAUTHORIZED, "An authenticated account is required");
        if (!"BUYER".equalsIgnoreCase(Objects.toString(user.getRole(), ""))) throw new ApiException(HttpStatus.FORBIDDEN, "Only a buyer account can start a bargaining conversation");
    }
    private String normalizeActiveRole(String role) {
        String normalized = role == null ? "BUYER" : role.trim().toUpperCase(Locale.ROOT);
        if (!List.of("BUYER", "SELLER").contains(normalized)) throw new ApiException(HttpStatus.FORBIDDEN, "Only buyer and seller roles can use bargaining chat");
        return normalized;
    }
    private String normalizeEmail(String email) { return email == null ? "" : email.trim().toLowerCase(Locale.ROOT); }
    private boolean blank(String value) { return value == null || value.isBlank(); }
    private String safeName(String name, String fallback) { return blank(name) ? fallback : name.trim().substring(0, Math.min(150, name.trim().length())); }
    private void validatePrice(BigDecimal price, BigDecimal original) {
        if (price == null || price.signum() <= 0 || price.scale() > 2) throw new ApiException(HttpStatus.BAD_REQUEST, "Offer price must be a positive amount with at most two decimal places");
        if (original == null || price.compareTo(original.multiply(new BigDecimal("2"))) > 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Offer price is outside the allowed range");
    }
}

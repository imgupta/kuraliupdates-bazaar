package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SellerDirectPaymentService {
    private final JdbcTemplate jdbc;

    @Transactional
    public Map<String,Object> saveSellerDestination(SellerEntity seller, String upiId, String payeeName, String actor) {
        if (seller == null || !"APPROVED".equalsIgnoreCase(seller.getStatus()))
            throw new ApiException(HttpStatus.FORBIDDEN, "Only an approved seller can configure payment instructions");
        String upi = upiId == null ? "" : upiId.trim().toLowerCase(Locale.ROOT);
        String payee = payeeName == null ? "" : payeeName.trim();
        if (!upi.matches("[a-z0-9._-]{2,256}@[a-z0-9.-]{2,64}") || payee.isBlank() || payee.length() > 150)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid UPI ID and payee name");
        List<Map<String,Object>> existing = jdbc.queryForList(
                "SELECT DESTINATION_ID FROM SELLER_PAYMENT_DESTINATIONS WHERE SELLER_ID=?", seller.getSellerId());
        String id;
        if (existing.isEmpty()) {
            id = "UPI-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase(Locale.ROOT);
            jdbc.update("INSERT INTO SELLER_PAYMENT_DESTINATIONS (DESTINATION_ID,SELLER_ID,UPI_ID,PAYEE_NAME,VERIFICATION_STATUS,ACTIVE_FLAG,UPDATED_BY,UPDATED_AT) VALUES (?,?,?,?,'PENDING_VERIFICATION',0,?,?)",
                    id, seller.getSellerId(), upi, payee, actor, LocalDateTime.now());
        } else {
            id = String.valueOf(existing.get(0).get("DESTINATION_ID"));
            jdbc.update("UPDATE SELLER_PAYMENT_DESTINATIONS SET UPI_ID=?,PAYEE_NAME=?,VERIFICATION_STATUS='PENDING_VERIFICATION',ACTIVE_FLAG=0,VERIFIED_BY=NULL,VERIFIED_AT=NULL,UPDATED_BY=?,UPDATED_AT=? WHERE SELLER_ID=?",
                    upi, payee, actor, LocalDateTime.now(), seller.getSellerId());
        }
        audit(null, seller.getSellerId(), id, actor == null ? seller.getUserId() : actor, "SELLER", "DESTINATION_SUBMITTED", null, "PENDING_VERIFICATION", null);
        return destination(seller.getSellerId());
    }

    @Transactional(readOnly = true)
    public Map<String,Object> destination(String sellerId) {
        List<Map<String,Object>> rows = jdbc.queryForList(
                "SELECT DESTINATION_ID AS \"destinationId\",SELLER_ID AS \"sellerId\",UPI_ID AS \"upiId\",PAYEE_NAME AS \"payeeName\",VERIFICATION_STATUS AS \"verificationStatus\",ACTIVE_FLAG AS \"active\",VERIFIED_AT AS \"verifiedAt\",UPDATED_AT AS \"updatedAt\" FROM SELLER_PAYMENT_DESTINATIONS WHERE SELLER_ID=?",
                sellerId);
        return rows.isEmpty() ? Map.of("configured", false) : rows.get(0);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> adminDestinations(String status) {
        String filter = status == null || status.isBlank() ? "PENDING_VERIFICATION" : status.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("PENDING_VERIFICATION","VERIFIED","REJECTED","ALL").contains(filter))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported destination status");
        String sql = "SELECT d.DESTINATION_ID AS \"destinationId\",d.SELLER_ID AS \"sellerId\",s.STORE_NAME AS \"storeName\",s.OWNER_NAME AS \"ownerName\",d.UPI_ID AS \"upiId\",d.PAYEE_NAME AS \"payeeName\",d.VERIFICATION_STATUS AS \"verificationStatus\",d.ACTIVE_FLAG AS \"active\",d.UPDATED_AT AS \"updatedAt\" FROM SELLER_PAYMENT_DESTINATIONS d JOIN SELLERS s ON s.SELLER_ID=d.SELLER_ID"
                + ("ALL".equals(filter) ? "" : " WHERE d.VERIFICATION_STATUS=?") + " ORDER BY d.UPDATED_AT";
        return "ALL".equals(filter) ? jdbc.queryForList(sql) : jdbc.queryForList(sql, filter);
    }

    @Transactional(readOnly = true)
    public Map<String,Object> buyerPaymentOptions(String sellerId) {
        try {
            Map<String,Object> row = jdbc.queryForMap(
                    "SELECT s.COD_ENABLED AS \"codEnabled\",CASE WHEN EXISTS (SELECT 1 FROM SELLER_PAYMENT_DESTINATIONS d WHERE d.SELLER_ID=s.SELLER_ID AND d.VERIFICATION_STATUS='VERIFIED' AND d.ACTIVE_FLAG=1) THEN 1 ELSE 0 END AS \"upiEnabled\" FROM SELLERS s WHERE s.SELLER_ID=? AND s.STATUS='APPROVED' AND s.STORE_OPEN=1",
                    sellerId);
            return Map.of("sellerId", sellerId, "codEnabled", ((Number) row.get("codEnabled")).intValue() == 1,
                    "upiEnabled", ((Number) row.get("upiEnabled")).intValue() == 1);
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Seller is not currently available for checkout");
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> codSettings() {
        return jdbc.queryForList("SELECT SELLER_ID AS \"sellerId\",STORE_NAME AS \"storeName\",COD_ENABLED AS \"codEnabled\" FROM SELLERS ORDER BY STORE_NAME");
    }

    @Transactional
    public Map<String,Object> updateCodEnabled(String sellerId, boolean enabled, String actor) {
        List<Map<String,Object>> rows = jdbc.queryForList("SELECT COD_ENABLED FROM SELLERS WHERE SELLER_ID=?", sellerId);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Seller not found");
        int previous = ((Number) rows.get(0).get("COD_ENABLED")).intValue();
        jdbc.update("UPDATE SELLERS SET COD_ENABLED=? WHERE SELLER_ID=?", enabled ? 1 : 0, sellerId);
        audit(null, sellerId, null, actor, "ADMIN", "COD_CONFIG_UPDATED", String.valueOf(previous),
                enabled ? "1" : "0", "Admin updated seller COD availability");
        return Map.of("sellerId", sellerId, "codEnabled", enabled);
    }

    @Transactional
    public Map<String,Object> reviewDestination(String sellerId, boolean approve, boolean activate, String reason, String actor) {
        Map<String,Object> before = destination(sellerId);
        if (Boolean.FALSE.equals(before.get("configured")))
            throw new ApiException(HttpStatus.NOT_FOUND, "Seller payment destination not found");
        String status = approve ? "VERIFIED" : "REJECTED";
        int active = approve && activate ? 1 : 0;
        jdbc.update("UPDATE SELLER_PAYMENT_DESTINATIONS SET VERIFICATION_STATUS=?,ACTIVE_FLAG=?,VERIFIED_BY=?,VERIFIED_AT=?,UPDATED_BY=?,UPDATED_AT=? WHERE SELLER_ID=?",
                status, active, actor, approve ? LocalDateTime.now() : null, actor, LocalDateTime.now(), sellerId);
        audit(null, sellerId, String.valueOf(before.get("destinationId")), actor, "ADMIN",
                approve ? (active == 1 ? "DESTINATION_VERIFIED_ACTIVATED" : "DESTINATION_VERIFIED") : "DESTINATION_REJECTED",
                String.valueOf(before.get("verificationStatus")), status, reason);
        return destination(sellerId);
    }

    @Transactional
    public void createForOrder(OrderEntity order, String buyerUserId) {
        if (!"UPI".equalsIgnoreCase(order.getPaymentMethod())) return;
        Map<String,Object> destination;
        try {
            destination = jdbc.queryForMap("SELECT UPI_ID,PAYEE_NAME FROM SELLER_PAYMENT_DESTINATIONS WHERE SELLER_ID=? AND VERIFICATION_STATUS='VERIFIED' AND ACTIVE_FLAG=1",
                    order.getSeller().getSellerId());
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "This seller has no verified active UPI payment destination. Choose COD or contact the seller.");
        }
        String paymentId = "PAY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase(Locale.ROOT);
        LocalDateTime now = LocalDateTime.now();
        jdbc.update("INSERT INTO ORDER_SELLER_PAYMENTS (PAYMENT_ID,ORDER_ID,CHECKOUT_GROUP_ID,SELLER_ID,BUYER_USER_ID,BUYER_EMAIL,EXPECTED_AMOUNT,CURRENCY,UPI_ID_SNAPSHOT,PAYEE_NAME_SNAPSHOT,PAYMENT_STATUS,EXPIRES_AT,CREATED_AT,UPDATED_AT) VALUES (?,?,?,?,?,?,?,'INR',?,?,'AWAITING_PAYMENT',?,?,?)",
                paymentId, order.getOrderId(), order.getCheckoutGroupId(), order.getSeller().getSellerId(), buyerUserId,
                order.getBuyerEmail(), order.getTotalAmount(), destination.get("UPI_ID"), destination.get("PAYEE_NAME"),
                now.plusHours(24), now, now);
        order.setPaymentStatus("PENDING_UPI");
        jdbc.update("UPDATE ORDERS SET PAYMENT_STATUS='PENDING_UPI' WHERE ORDER_ID=?", order.getOrderId());
        audit(paymentId, order.getSeller().getSellerId(), null, buyerUserId, "BUYER",
                "PAYMENT_INSTRUCTIONS_SNAPSHOTTED", null, "AWAITING_PAYMENT", null);
    }

    @Transactional
    public void cancelUnpaidPaymentForOrder(String orderId) {
        jdbc.update("UPDATE ORDER_SELLER_PAYMENTS SET PAYMENT_STATUS='CANCELLED',UPDATED_AT=? WHERE ORDER_ID=? AND PAYMENT_STATUS IN ('AWAITING_PAYMENT','AWAITING_SELLER_CONFIRMATION','PAYMENT_REJECTED','PAYMENT_EXPIRED')",
                LocalDateTime.now(), orderId);
        jdbc.update("UPDATE ORDERS SET PAYMENT_STATUS='CANCELLED' WHERE ORDER_ID=? AND PAYMENT_STATUS IN ('PENDING_UPI','PAYMENT_EXPIRED')",
                orderId);
    }

    @Transactional
    public void updateOrderAmount(OrderEntity order) {
        if (!"UPI".equalsIgnoreCase(order.getPaymentMethod())) return;
        jdbc.update("UPDATE ORDER_SELLER_PAYMENTS SET EXPECTED_AMOUNT=?,CHECKOUT_GROUP_ID=?,UPDATED_AT=? WHERE ORDER_ID=?",
                order.getTotalAmount(), order.getCheckoutGroupId(), LocalDateTime.now(), order.getOrderId());
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Map<String,Object> submitUtr(String orderId, String buyerUserId, String buyerEmail, String utr, String idempotencyKey) {
        String reference = utr == null ? "" : utr.trim().toUpperCase(Locale.ROOT);
        String key = idempotencyKey == null ? "" : idempotencyKey.trim();
        if (!reference.matches("[A-Z0-9-]{6,64}") || !key.matches("[A-Za-z0-9._:-]{8,100}"))
            throw new ApiException(HttpStatus.BAD_REQUEST, "A valid UTR/reference and idempotency key are required");
        Map<String,Object> p = lockBuyerPayment(orderId, buyerUserId);
        if (key.equals(p.get("IDEMPOTENCY_KEY")) && reference.equals(p.get("UTR_REFERENCE"))) return buyerView(p);
        String state = String.valueOf(p.get("PAYMENT_STATUS"));
        if (!Set.of("AWAITING_PAYMENT","PAYMENT_REJECTED").contains(state))
            throw new ApiException(HttpStatus.CONFLICT, "This payment is not awaiting a new UTR submission");
        if (asDate(p.get("EXPIRES_AT")).isBefore(LocalDateTime.now())) {
            jdbc.update("UPDATE ORDER_SELLER_PAYMENTS SET PAYMENT_STATUS='PAYMENT_EXPIRED',UPDATED_AT=? WHERE ORDER_ID=?", LocalDateTime.now(), orderId);
            jdbc.update("UPDATE ORDERS SET PAYMENT_STATUS='PAYMENT_EXPIRED' WHERE ORDER_ID=?", orderId);
            throw new ApiException(HttpStatus.GONE, "The seller payment request has expired");
        }
        try {
            jdbc.update("UPDATE ORDER_SELLER_PAYMENTS SET UTR_REFERENCE=?,BUYER_SUBMITTED_AT=?,IDEMPOTENCY_KEY=?,PAYMENT_STATUS='AWAITING_SELLER_CONFIRMATION',UPDATED_AT=? WHERE ORDER_ID=?",
                    reference, LocalDateTime.now(), key, LocalDateTime.now(), orderId);
        } catch (org.springframework.dao.DuplicateKeyException ex) {
            throw new ApiException(HttpStatus.CONFLICT, "This UTR or submission key has already been used");
        }
        audit(String.valueOf(p.get("PAYMENT_ID")), String.valueOf(p.get("SELLER_ID")), null, buyerUserId, "BUYER",
                "UTR_SUBMITTED", state, "AWAITING_SELLER_CONFIRMATION", null);
        return buyerPayment(orderId, buyerUserId);
    }

    @Transactional
    public Map<String,Object> buyerPayment(String orderId, String buyerUserId) {
        expirePending();
        if (buyerUserId == null || buyerUserId.isBlank()) throw new ApiException(HttpStatus.UNAUTHORIZED, "Buyer session required");
        try {
            return buyerView(jdbc.queryForMap("SELECT p.* FROM ORDER_SELLER_PAYMENTS p WHERE p.ORDER_ID=? AND p.BUYER_USER_ID=?",
                    orderId, buyerUserId));
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment record not found");
        }
    }

    @Transactional
    public List<Map<String,Object>> buyerGroupPayments(String checkoutGroupId, String buyerUserId) {
        expirePending();
        if (buyerUserId == null || buyerUserId.isBlank()) throw new ApiException(HttpStatus.UNAUTHORIZED, "Buyer session required");
        List<Map<String,Object>> rows = jdbc.queryForList(
                "SELECT ORDER_ID FROM ORDER_SELLER_PAYMENTS WHERE CHECKOUT_GROUP_ID=? AND BUYER_USER_ID=? ORDER BY CREATED_AT",
                checkoutGroupId, buyerUserId);
        List<Map<String,Object>> result = new ArrayList<>();
        for (Map<String,Object> row : rows) result.add(buyerPayment(String.valueOf(row.get("ORDER_ID")), buyerUserId));
        return result;
    }

    @Transactional
    public List<Map<String,Object>> sellerPayments(String sellerId) {
        expirePending();
        return jdbc.queryForList("SELECT p.PAYMENT_ID AS \"paymentId\",p.ORDER_ID AS \"orderId\",p.CHECKOUT_GROUP_ID AS \"checkoutGroupId\",p.BUYER_EMAIL AS \"buyerEmail\",p.EXPECTED_AMOUNT AS \"expectedAmount\",p.UPI_ID_SNAPSHOT AS \"upiId\",p.PAYEE_NAME_SNAPSHOT AS \"payeeName\",p.PAYMENT_STATUS AS \"paymentStatus\",p.UTR_REFERENCE AS \"utrReference\",p.BUYER_SUBMITTED_AT AS \"buyerSubmittedAt\",p.EXPIRES_AT AS \"expiresAt\",p.REFUND_STATUS AS \"refundStatus\",p.REFUND_REASON AS \"refundReason\",p.REFUND_AMOUNT AS \"refundAmount\",p.REFUND_REFERENCE AS \"refundReference\" FROM ORDER_SELLER_PAYMENTS p WHERE p.SELLER_ID=? ORDER BY p.CREATED_AT DESC",
                sellerId);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Map<String,Object> sellerDecision(String sellerId, String paymentId, boolean confirm, String reason, String actor) {
        Map<String,Object> p;
        try {
            p = jdbc.queryForMap("SELECT * FROM ORDER_SELLER_PAYMENTS WHERE PAYMENT_ID=? AND SELLER_ID=? FOR UPDATE", paymentId, sellerId);
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment record not found");
        }
        String previous = String.valueOf(p.get("PAYMENT_STATUS"));
        if (!"AWAITING_SELLER_CONFIRMATION".equals(previous))
            throw new ApiException(HttpStatus.CONFLICT, "Only a submitted UTR can be confirmed or rejected");
        if (!confirm && safeReason(reason) == null)
            throw new ApiException(HttpStatus.BAD_REQUEST, "A rejection reason is required");
        if (asDate(p.get("EXPIRES_AT")).isBefore(LocalDateTime.now())) {
            jdbc.update("UPDATE ORDER_SELLER_PAYMENTS SET PAYMENT_STATUS='PAYMENT_EXPIRED',UPDATED_AT=? WHERE PAYMENT_ID=?", LocalDateTime.now(), paymentId);
            jdbc.update("UPDATE ORDERS SET PAYMENT_STATUS='PAYMENT_EXPIRED' WHERE ORDER_ID=?", p.get("ORDER_ID"));
            throw new ApiException(HttpStatus.GONE, "Payment submission expired before seller review");
        }
        String next = confirm ? "PAYMENT_CONFIRMED" : "PAYMENT_REJECTED";
        jdbc.update("UPDATE ORDER_SELLER_PAYMENTS SET PAYMENT_STATUS=?,SELLER_DECISION_BY=?,SELLER_DECISION_AT=?,SELLER_REJECTION_REASON=?,UPDATED_AT=? WHERE PAYMENT_ID=?",
                next, actor, LocalDateTime.now(), confirm ? null : safeReason(reason), LocalDateTime.now(), paymentId);
        jdbc.update("UPDATE ORDERS SET PAYMENT_STATUS=? WHERE ORDER_ID=?", confirm ? "PAID" : "PENDING_UPI", p.get("ORDER_ID"));
        audit(paymentId, sellerId, null, actor, "SELLER", confirm ? "PAYMENT_CONFIRMED" : "PAYMENT_REJECTED", previous, next, reason);
        return sellerPayments(sellerId).stream().filter(row -> paymentId.equals(row.get("paymentId"))).findFirst().orElse(Map.of());
    }

    @Transactional
    public Map<String,Object> requestRefund(String orderId, String buyerUserId, String buyerEmail, String reason) {
        Map<String,Object> p = lockBuyerPayment(orderId, buyerUserId);
        if (!"PAYMENT_CONFIRMED".equals(p.get("PAYMENT_STATUS")))
            throw new ApiException(HttpStatus.CONFLICT, "Only a seller-confirmed payment can enter the refund workflow");
        String current = String.valueOf(p.get("REFUND_STATUS"));
        if (!Set.of("NOT_REQUESTED","REJECTED_BY_SELLER").contains(current))
            throw new ApiException(HttpStatus.CONFLICT, "A refund request is already active");
        String why = safeReason(reason);
        if (why == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Refund reason is required");
        jdbc.update("UPDATE ORDER_SELLER_PAYMENTS SET REFUND_STATUS='REQUESTED',REFUND_REASON=?,REFUND_AMOUNT=EXPECTED_AMOUNT,REFUND_UPDATED_BY=?,REFUND_UPDATED_AT=?,UPDATED_AT=? WHERE ORDER_ID=?",
                why, buyerEmail, LocalDateTime.now(), LocalDateTime.now(), orderId);
        audit(String.valueOf(p.get("PAYMENT_ID")), String.valueOf(p.get("SELLER_ID")), null, buyerUserId, "BUYER",
                "REFUND_REQUESTED", current, "REQUESTED", why);
        return buyerPayment(orderId, buyerUserId);
    }

    @Transactional
    public Map<String,Object> sellerRefund(String sellerId, String paymentId, String action, String reference, String reason, String actor) {
        Map<String,Object> p;
        try { p = jdbc.queryForMap("SELECT * FROM ORDER_SELLER_PAYMENTS WHERE PAYMENT_ID=? AND SELLER_ID=? FOR UPDATE", paymentId, sellerId); }
        catch (org.springframework.dao.EmptyResultDataAccessException ex) { throw new ApiException(HttpStatus.NOT_FOUND, "Payment record not found"); }
        String current = String.valueOf(p.get("REFUND_STATUS"));
        String next;
        String normalized = action == null ? "" : action.trim().toUpperCase(Locale.ROOT);
        if ("INITIATE".equals(normalized) && "REQUESTED".equals(current)) next = "INITIATED_BY_SELLER";
        else if ("COMPLETE".equals(normalized) && "INITIATED_BY_SELLER".equals(current)) {
            if (reference == null || !reference.trim().matches("[A-Za-z0-9-]{6,100}"))
                throw new ApiException(HttpStatus.BAD_REQUEST, "Actual seller refund reference is required");
            next = "COMPLETED_BY_SELLER";
        } else if ("REJECT".equals(normalized) && "REQUESTED".equals(current)) next = "REJECTED_BY_SELLER";
        else throw new ApiException(HttpStatus.CONFLICT, "Invalid seller-funded refund transition");
        jdbc.update("UPDATE ORDER_SELLER_PAYMENTS SET REFUND_STATUS=?,REFUND_REFERENCE=?,REFUND_UPDATED_BY=?,REFUND_UPDATED_AT=?,UPDATED_AT=? WHERE PAYMENT_ID=?",
                next, "COMPLETE".equals(normalized) ? reference.trim() : null, actor, LocalDateTime.now(), LocalDateTime.now(), paymentId);
        audit(paymentId, sellerId, null, actor, "SELLER", "REFUND_" + normalized, current, next, reason);
        return sellerPayments(sellerId).stream().filter(row -> paymentId.equals(row.get("paymentId"))).findFirst().orElse(Map.of());
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> adminOrderIssues(String status) {
        String normalized = status == null || status.isBlank() ? "OPEN" : status.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("OPEN","IN_REVIEW","RESOLVED","CLOSED","ALL").contains(normalized))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported issue status");
        String sql = "SELECT i.ISSUE_ID AS \"issueId\",i.ORDER_ID AS \"orderId\",i.BUYER_EMAIL AS \"buyerEmail\",i.ISSUE_TYPE AS \"issueType\",i.DESCRIPTION AS \"description\",i.STATUS AS \"status\",i.CREATED_AT AS \"createdAt\",i.UPDATED_AT AS \"updatedAt\",o.SELLER_ID AS \"sellerId\" FROM ORDER_ISSUES i JOIN ORDERS o ON o.ORDER_ID=i.ORDER_ID"
                + ("ALL".equals(normalized) ? "" : " WHERE i.STATUS=?") + " ORDER BY i.CREATED_AT DESC";
        return "ALL".equals(normalized) ? jdbc.queryForList(sql) : jdbc.queryForList(sql, normalized);
    }

    @Transactional
    public Map<String,Object> updateIssueStatus(String issueId, String status, String actor) {
        String next = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("OPEN","IN_REVIEW","RESOLVED","CLOSED").contains(next))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported issue status");
        List<Map<String,Object>> rows = jdbc.queryForList("SELECT ORDER_ID,STATUS FROM ORDER_ISSUES WHERE ISSUE_ID=? FOR UPDATE", issueId);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Order issue not found");
        String previous = String.valueOf(rows.get(0).get("STATUS"));
        jdbc.update("UPDATE ORDER_ISSUES SET STATUS=?,UPDATED_AT=? WHERE ISSUE_ID=?", next, LocalDateTime.now(), issueId);
        audit(null, null, null, actor, "ADMIN", "ORDER_ISSUE_STATUS_UPDATED", previous, next, issueId);
        return Map.of("issueId", issueId, "status", next);
    }

    @Transactional
    public Map<String,Object> createIssue(String orderId, String buyerUserId, String buyerEmail, String issueType, String description) {
        List<Map<String,Object>> owned = jdbc.queryForList("SELECT ORDER_ID FROM ORDERS WHERE ORDER_ID=? AND BUYER_USER_ID=?",
                orderId, buyerUserId);
        if (owned.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Order not found");
        String type = issueType == null ? "" : issueType.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("MISSING_ITEM","WRONG_ITEM","DAMAGED","POOR_QUALITY","NOT_DELIVERED","PAYMENT","REFUND","OTHER").contains(type))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported issue type");
        String detail = description == null ? "" : description.trim();
        if (detail.isBlank() || detail.length() > 1000) throw new ApiException(HttpStatus.BAD_REQUEST, "Issue description is required (maximum 1000 characters)");
        String id = "ISS-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase(Locale.ROOT);
        jdbc.update("INSERT INTO ORDER_ISSUES (ISSUE_ID,ORDER_ID,BUYER_USER_ID,BUYER_EMAIL,ISSUE_TYPE,DESCRIPTION,STATUS) VALUES (?,?,?,?,?,?,'OPEN')",
                id, orderId, buyerUserId, buyerEmail, type, detail);
        audit(null, null, null, buyerUserId, "BUYER", "ORDER_ISSUE_CREATED", null, "OPEN", id + ": " + type);
        return Map.of("issueId", id, "orderId", orderId, "issueType", type, "status", "OPEN");
    }

    private Map<String,Object> lockBuyerPayment(String orderId, String buyerUserId) {
        if (buyerUserId == null || buyerUserId.isBlank()) throw new ApiException(HttpStatus.UNAUTHORIZED, "Buyer session required");
        try {
            return jdbc.queryForMap("SELECT p.* FROM ORDER_SELLER_PAYMENTS p WHERE p.ORDER_ID=? AND p.BUYER_USER_ID=? FOR UPDATE",
                    orderId, buyerUserId);
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment record not found");
        }
    }
    private Map<String,Object> buyerView(Map<String,Object> p) {
        Map<String,Object> v = new LinkedHashMap<>();
        v.put("paymentId", p.get("PAYMENT_ID")); v.put("orderId", p.get("ORDER_ID"));
        v.put("checkoutGroupId", p.get("CHECKOUT_GROUP_ID")); v.put("expectedAmount", p.get("EXPECTED_AMOUNT"));
        v.put("currency", p.get("CURRENCY")); v.put("upiId", p.get("UPI_ID_SNAPSHOT"));
        v.put("payeeName", p.get("PAYEE_NAME_SNAPSHOT")); v.put("paymentStatus", p.get("PAYMENT_STATUS"));
        v.put("utrReference", p.get("UTR_REFERENCE")); v.put("buyerSubmittedAt", p.get("BUYER_SUBMITTED_AT"));
        v.put("expiresAt", p.get("EXPIRES_AT")); v.put("refundStatus", p.get("REFUND_STATUS"));
        v.put("refundReason", p.get("REFUND_REASON")); v.put("refundAmount", p.get("REFUND_AMOUNT"));
        v.put("refundReference", p.get("REFUND_REFERENCE"));
        v.put("notice", "Pay the seller directly. Returning from a UPI app or submitting a UTR does not confirm payment.");
        return v;
    }
    /**
     * Distributed-safe expiry sweep. Oracle row locks with SKIP LOCKED let multiple
     * application instances run the same scheduled sweep without double-processing rows.
     */
    @Transactional
    public int expirePendingPaymentsBatch() {
        LocalDateTime now = LocalDateTime.now();
        List<Map<String,Object>> expired = jdbc.queryForList(
                "SELECT PAYMENT_ID,ORDER_ID,SELLER_ID,PAYMENT_STATUS FROM ORDER_SELLER_PAYMENTS "
                        + "WHERE PAYMENT_STATUS IN ('AWAITING_PAYMENT','AWAITING_SELLER_CONFIRMATION') "
                        + "AND EXPIRES_AT<? FOR UPDATE SKIP LOCKED", now);
        int count = 0;
        for (Map<String,Object> row : expired) {
            String paymentId = String.valueOf(row.get("PAYMENT_ID"));
            String orderId = String.valueOf(row.get("ORDER_ID"));
            String sellerId = String.valueOf(row.get("SELLER_ID"));
            String previous = String.valueOf(row.get("PAYMENT_STATUS"));
            int updated = jdbc.update(
                    "UPDATE ORDER_SELLER_PAYMENTS SET PAYMENT_STATUS='PAYMENT_EXPIRED',UPDATED_AT=? "
                            + "WHERE PAYMENT_ID=? AND PAYMENT_STATUS IN ('AWAITING_PAYMENT','AWAITING_SELLER_CONFIRMATION')",
                    now, paymentId);
            if (updated == 1) {
                jdbc.update("UPDATE ORDERS SET PAYMENT_STATUS='PAYMENT_EXPIRED' WHERE ORDER_ID=? AND PAYMENT_STATUS='PENDING_UPI'",
                        orderId);
                audit(paymentId, sellerId, null, "system", "SYSTEM", "PAYMENT_EXPIRED",
                        previous, "PAYMENT_EXPIRED", "24-hour seller payment window elapsed");
                count++;
            }
        }
        return count;
    }

    private void expirePending() {
        expirePendingPaymentsBatch();
    }
    private LocalDateTime asDate(Object value) {
        if (value instanceof java.sql.Timestamp t) return t.toLocalDateTime();
        if (value instanceof LocalDateTime d) return d;
        return LocalDateTime.now().minusSeconds(1);
    }
    private String safeReason(String reason) {
        if (reason == null || reason.isBlank()) return null;
        return reason.trim().substring(0, Math.min(500, reason.trim().length()));
    }
    private void audit(String paymentId, String sellerId, String destinationId, String actor, String role,
                       String action, String previous, String next, String reason) {
        jdbc.update("INSERT INTO SELLER_PAYMENT_AUDIT (AUDIT_ID,PAYMENT_ID,SELLER_ID,DESTINATION_ID,ACTOR_EMAIL,ACTOR_ROLE,ACTION,PREVIOUS_STATE,NEXT_STATE,REASON,CREATED_AT) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                "PAUD-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase(Locale.ROOT),
                paymentId, sellerId, destinationId, actor == null ? "system" : actor, role, action, previous, next, safeReason(reason), LocalDateTime.now());
    }
}

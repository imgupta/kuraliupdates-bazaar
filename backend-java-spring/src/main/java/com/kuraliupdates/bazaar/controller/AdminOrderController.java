package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.order.OrderResponse;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.ProductEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {
    private final OrderRepository orders;
    private final ProductRepository products;
    private final JdbcTemplate jdbc;

    private UserEntity requireRootAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Object principal = auth == null ? null : auth.getPrincipal();
        UserEntity actor = principal instanceof UserEntity u ? u : null;
        if (actor == null || !Integer.valueOf(1).equals(actor.getIsAdmin())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Root administrator access is required.");
        }
        return actor;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<OrderResponse> list(@RequestParam(required = false) String search,
                                   @RequestParam(required = false) String status) {
        requireRootAdmin();
        String q = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String state = status == null ? "" : status.trim();
        return orders.findAll().stream()
                .filter(o -> state.isBlank() || state.equalsIgnoreCase(o.getStatus()))
                .filter(o -> q.isBlank() || List.of(
                        safe(o.getOrderId()), safe(o.getBuyerName()), safe(o.getBuyerPhone()),
                        safe(o.getBuyerEmail()), safe(o.getSeller() == null ? null : o.getSeller().getStoreName()))
                        .stream().anyMatch(v -> v.toLowerCase(Locale.ROOT).contains(q)))
                .sorted(Comparator.comparing(OrderEntity::getPlacedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(OrderResponse::from).toList();
    }

    @PatchMapping("/{orderId}")
    @Transactional
    public OrderResponse updateDetails(@PathVariable String orderId, @RequestBody Map<String, String> body) {
        UserEntity actor = requireRootAdmin();
        OrderEntity order = orders.findLockedByOrderId(orderId).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Order not found"));
        String name = value(body, "buyerName", order.getBuyerName());
        String phone = value(body, "buyerPhone", order.getBuyerPhone()).replaceAll("\\D", "");
        String email = value(body, "buyerEmail", order.getBuyerEmail()).toLowerCase(Locale.ROOT);
        String address = value(body, "deliveryAddress", order.getDeliveryAddress());
        String locality = value(body, "deliveryLocality", order.getDeliveryLocality());
        if (name.isBlank() || name.length() > 150 || !phone.matches("\\d{10}") ||
                (!email.isBlank() && !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) ||
                address.isBlank() || address.length() > 500 || locality.isBlank() || locality.length() > 150) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Check customer name, 10-digit mobile, email and delivery address.");
        }
        List<String> changed = new ArrayList<>();
        if (!Objects.equals(order.getBuyerName(), name)) { order.setBuyerName(name); changed.add("buyerName"); }
        if (!Objects.equals(order.getBuyerPhone(), phone)) { order.setBuyerPhone(phone); changed.add("buyerPhone"); }
        if (!Objects.equals(order.getBuyerEmail(), email)) { order.setBuyerEmail(email); changed.add("buyerEmail"); }
        if (!Objects.equals(order.getDeliveryAddress(), address)) { order.setDeliveryAddress(address); changed.add("deliveryAddress"); }
        if (!Objects.equals(order.getDeliveryLocality(), locality)) { order.setDeliveryLocality(locality); changed.add("deliveryLocality"); }
        order.setUpdatedAt(LocalDateTime.now());
        OrderEntity saved = orders.save(order);
        if (!changed.isEmpty()) {
            String details = "Updated: " + String.join(", ", changed);
            audit(actor, saved, "ORDER_DETAILS_UPDATE", details);
            recordEvent(saved, actor, "ORDER_DETAILS_UPDATED", details);
            queueCustomerNotice(saved, "ORDER_UPDATED", "Your KuraliUpdates order " + orderId + " delivery/contact details were updated by support.");
        }
        return OrderResponse.from(saved);
    }

    @PostMapping("/{orderId}/cancel")
    @Transactional
    public OrderResponse cancel(@PathVariable String orderId, @RequestBody(required = false) Map<String, String> body) {
        UserEntity actor = requireRootAdmin();
        OrderEntity snapshot = orders.findById(orderId).orElseThrow(() ->
                new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Order not found"));
        List<OrderEntity> group = snapshot.getCheckoutGroupId() == null || snapshot.getCheckoutGroupId().isBlank()
                ? List.of(orders.findLockedByOrderId(orderId).orElseThrow())
                : orders.findLockedByCheckoutGroupId(snapshot.getCheckoutGroupId());
        if (group.isEmpty() || group.stream().noneMatch(o -> orderId.equals(o.getOrderId()))) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Order not found");
        }
        for (OrderEntity order : group) {
            if ("CANCELLED".equalsIgnoreCase(order.getStatus())) continue;
            if (!Set.of("PLACED", "ACCEPTED_BY_SELLER").contains(safe(order.getStatus()).toUpperCase(Locale.ROOT)) ||
                    !"COD".equalsIgnoreCase(order.getPaymentMethod()) || "PAID".equalsIgnoreCase(order.getPaymentStatus()) ||
                    order.getDeliveryAgent() != null || order.getCombinedDeliveryBatchId() != null) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                        "This checkout can only be cancelled before fulfilment, delivery assignment and payment collection.");
            }
            if (order.getItems() == null || order.getItems().isEmpty()) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Order inventory items are unavailable; cancellation was not applied.");
            }
        }
        Map<String, Integer> restore = new TreeMap<>();
        for (OrderEntity order : group) if (!"CANCELLED".equalsIgnoreCase(order.getStatus()))
            for (var item : order.getItems()) restore.merge(item.getProduct().getProductId(), item.getQuantity(), Math::addExact);
        for (var entry : restore.entrySet()) {
            ProductEntity product = products.findLockedByProductId(entry.getKey()).orElseThrow(() ->
                    new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Product inventory could not be locked."));
            product.setStock(Math.addExact(product.getStock() == null ? 0 : product.getStock(), entry.getValue()));
            products.save(product);
        }
        LocalDateTime now = LocalDateTime.now();
        for (OrderEntity order : group) {
            if ("CANCELLED".equalsIgnoreCase(order.getStatus())) continue;
            order.setStatus("CANCELLED");
            order.setFulfilmentStatus("CANCELLED");
            order.setUpdatedAt(now);
            String reason = body == null ? "Cancelled by administrator" : body.getOrDefault("reason", "Cancelled by administrator");
            audit(actor, order, "ORDER_CANCELLED", reason);
            recordEvent(order, actor, "ORDER_CANCELLED", reason);
            queueCustomerNotice(order, "ORDER_CANCELLED", "Your KuraliUpdates order " + order.getOrderId() + " has been cancelled.");
        }
        orders.saveAll(group);
        return OrderResponse.from(group.stream().filter(o -> orderId.equals(o.getOrderId())).findFirst().orElseThrow());
    }


    @PutMapping("/{orderId}/items")
    @Transactional
    public OrderResponse updateItems(@PathVariable String orderId, @RequestBody Map<String, Object> body) {
        UserEntity actor = requireRootAdmin();
        OrderEntity order = orders.findLockedByOrderId(orderId).orElseThrow(() ->
            new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Order not found"));
        if (!Set.of("PLACED", "ACCEPTED_BY_SELLER").contains(safe(order.getStatus()).toUpperCase(Locale.ROOT))
                || order.getDeliveryAgent() != null || order.getCombinedDeliveryBatchId() != null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Items can only be changed before fulfilment and rider assignment.");
        }
        Object raw = body == null ? null : body.get("items");
        if (!(raw instanceof List<?> requested) || requested.isEmpty())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Provide at least one item and quantity.");
        Map<String,Integer> quantities = new LinkedHashMap<>();
        for (Object row : requested) {
            if (!(row instanceof Map<?,?> m) || m.get("itemId") == null || !(m.get("quantity") instanceof Number n))
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Each item needs itemId and quantity.");
            int q=n.intValue(); if(q<1 || q>999) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Quantity must be between 1 and 999.");
            quantities.put(String.valueOf(m.get("itemId")),q);
        }
        if (quantities.size()!=order.getItems().size() || order.getItems().stream().anyMatch(i->!quantities.containsKey(i.getItemId())))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Only quantities of existing order items can be changed.");
        BigDecimal oldSubtotal = order.getSubtotal()==null?BigDecimal.ZERO:order.getSubtotal();
        Map<String,Integer> deltas=new TreeMap<>();
        for (var item:order.getItems()) deltas.merge(item.getProduct().getProductId(), quantities.get(item.getItemId())-item.getQuantity(), Integer::sum);
        for(var e:deltas.entrySet()) if(e.getValue()!=0) {
            ProductEntity p=products.findLockedByProductId(e.getKey()).orElseThrow();
            int available=p.getStock()==null?0:p.getStock();
            if(e.getValue()>available) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Insufficient stock for "+p.getTitle());
            p.setStock(available-e.getValue()); products.save(p);
        }
        BigDecimal newSubtotal=BigDecimal.ZERO;
        for(var item:order.getItems()) {
            int q=quantities.get(item.getItemId()); item.setQuantity(q);
            BigDecimal unit=item.getNegotiatedPrice()!=null?item.getNegotiatedPrice():item.getUnitPrice();
            item.setTotalPrice(unit.multiply(BigDecimal.valueOf(q)).setScale(2, java.math.RoundingMode.HALF_UP));
            newSubtotal=newSubtotal.add(item.getTotalPrice());
        }
        BigDecimal delta=newSubtotal.subtract(oldSubtotal);
        order.setSubtotal(newSubtotal);
        order.setTotalAmount((order.getTotalAmount()==null?oldSubtotal:order.getTotalAmount()).add(delta).max(BigDecimal.ZERO).setScale(2,java.math.RoundingMode.HALF_UP));
        order.setUpdatedAt(LocalDateTime.now()); orders.save(order);
        recordEvent(order,actor,"ITEMS_UPDATED","Order quantities updated; subtotal "+oldSubtotal+" -> "+newSubtotal);
        queueCustomerNotice(order,"ORDER_UPDATED","Your KuraliUpdates order "+orderId+" was updated by support. Revised total: ₹"+order.getTotalAmount());
        return OrderResponse.from(order);
    }

    @GetMapping("/{orderId}/history")
    @Transactional(readOnly=true)
    public List<Map<String,Object>> history(@PathVariable String orderId) {
        requireRootAdmin(); ensureOrder(orderId);
        return jdbc.queryForList("SELECT EVENT_TYPE, DETAILS, ACTOR_EMAIL, OCCURRED_AT FROM ADMIN_ORDER_EVENTS WHERE ORDER_ID=? ORDER BY OCCURRED_AT DESC",orderId);
    }

    @GetMapping("/{orderId}/notes")
    @Transactional(readOnly=true)
    public List<Map<String,Object>> notes(@PathVariable String orderId) {
        requireRootAdmin(); ensureOrder(orderId);
        return jdbc.queryForList("SELECT NOTE_ID, NOTE_TEXT, CREATED_BY, CREATED_AT FROM ADMIN_ORDER_NOTES WHERE ORDER_ID=? ORDER BY CREATED_AT DESC",orderId);
    }

    @PostMapping("/{orderId}/notes")
    @Transactional
    public Map<String,Object> addNote(@PathVariable String orderId,@RequestBody Map<String,String> body) {
        UserEntity actor=requireRootAdmin(); ensureOrder(orderId);
        String note=value(body,"note","");
        if(note.isBlank()||note.length()>2000) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Note must contain 1–2000 characters.");
        String id=UUID.randomUUID().toString(); LocalDateTime now=LocalDateTime.now();
        jdbc.update("INSERT INTO ADMIN_ORDER_NOTES (NOTE_ID,ORDER_ID,NOTE_TEXT,CREATED_BY,CREATED_AT) VALUES (?,?,?,?,?)",id,orderId,note,actor.getEmail(),now);
        recordEvent(orders.findById(orderId).orElseThrow(),actor,"INTERNAL_NOTE_ADDED","Internal support note added");
        return Map.of("noteId",id,"note",note,"createdBy",actor.getEmail(),"createdAt",now);
    }

    @GetMapping("/{orderId}/refunds")
    @Transactional(readOnly=true)
    public List<Map<String,Object>> refunds(@PathVariable String orderId) {
        requireRootAdmin(); ensureOrder(orderId);
        return jdbc.queryForList("SELECT REFUND_ID,AMOUNT,STATUS,REASON,TRANSACTION_REFERENCE,REQUESTED_BY,REQUESTED_AT,PROCESSED_BY,PROCESSED_AT FROM ADMIN_ORDER_REFUNDS WHERE ORDER_ID=? ORDER BY REQUESTED_AT DESC",orderId);
    }

    @PostMapping("/{orderId}/refunds")
    @Transactional
    public Map<String,Object> requestRefund(@PathVariable String orderId,@RequestBody Map<String,String> body) {
        UserEntity actor=requireRootAdmin(); OrderEntity order=ensureOrder(orderId);
        if(!"PAID".equalsIgnoreCase(safe(order.getPaymentStatus())))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Refund requests are only allowed for paid orders.");
        BigDecimal amount; try{amount=new BigDecimal(value(body,"amount",""));}catch(Exception ex){throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Enter a valid refund amount.");}
        if(amount.signum()<=0 || amount.compareTo(order.getTotalAmount())>0) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Refund must be greater than zero and no more than the order total.");
        BigDecimal already=jdbc.queryForObject("SELECT NVL(SUM(AMOUNT),0) FROM ADMIN_ORDER_REFUNDS WHERE ORDER_ID=? AND STATUS IN ('REQUESTED','PROCESSED')",BigDecimal.class,orderId);
        if(already.add(amount).compareTo(order.getTotalAmount())>0) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Refund would exceed the remaining refundable amount.");
        String id=UUID.randomUUID().toString(); String reason=value(body,"reason","Admin refund request");
        jdbc.update("INSERT INTO ADMIN_ORDER_REFUNDS (REFUND_ID,ORDER_ID,AMOUNT,STATUS,REASON,REQUESTED_BY,REQUESTED_AT) VALUES (?,?,?,'REQUESTED',?,?,?)",id,orderId,amount,reason,actor.getEmail(),LocalDateTime.now());
        recordEvent(order,actor,"REFUND_REQUESTED","Refund request ₹"+amount+": "+reason);
        queueCustomerNotice(order,"REFUND_REQUESTED","A refund of ₹"+amount+" has been requested for order "+orderId+". Processing is subject to payment-provider confirmation.");
        return Map.of("refundId",id,"amount",amount,"status","REQUESTED");
    }

    @PostMapping("/{orderId}/refunds/{refundId}/processed")
    @Transactional
    public Map<String,Object> markRefundProcessed(@PathVariable String orderId,@PathVariable String refundId,@RequestBody Map<String,String> body) {
        UserEntity actor=requireRootAdmin(); OrderEntity order=ensureOrder(orderId);
        String reference=value(body,"transactionReference","");
        if(reference.isBlank()||reference.length()>150) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"A payment-provider transaction reference is required.");
        int changed=jdbc.update("UPDATE ADMIN_ORDER_REFUNDS SET STATUS='PROCESSED',TRANSACTION_REFERENCE=?,PROCESSED_BY=?,PROCESSED_AT=? WHERE REFUND_ID=? AND ORDER_ID=? AND STATUS='REQUESTED'",reference,actor.getEmail(),LocalDateTime.now(),refundId,orderId);
        if(changed!=1) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"Refund is missing or is not awaiting processing.");
        recordEvent(order,actor,"REFUND_PROCESSED","Refund processed; provider reference "+reference);
        queueCustomerNotice(order,"REFUND_PROCESSED","A refund for order "+orderId+" has been marked processed. Reference: "+reference);
        return Map.of("refundId",refundId,"status","PROCESSED","transactionReference",reference);
    }

    private OrderEntity ensureOrder(String id) {
        return orders.findById(id).orElseThrow(()->new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"Order not found"));
    }
    private void recordEvent(OrderEntity order,UserEntity actor,String type,String details) {
        jdbc.update("INSERT INTO ADMIN_ORDER_EVENTS (EVENT_ID,ORDER_ID,EVENT_TYPE,DETAILS,ACTOR_EMAIL,OCCURRED_AT) VALUES (?,?,?,?,?,?)",
            UUID.randomUUID().toString(),order.getOrderId(),type,details,actor.getEmail(),LocalDateTime.now());
    }
    private void queueCustomerNotice(OrderEntity order,String type,String message) {
        jdbc.update("INSERT INTO ADMIN_ORDER_NOTICE_OUTBOX (NOTICE_ID,ORDER_ID,RECIPIENT_EMAIL,RECIPIENT_PHONE,EVENT_TYPE,MESSAGE_TEXT,DELIVERY_STATUS,CREATED_AT) VALUES (?,?,?,?,?,?,'PENDING',?)",
            UUID.randomUUID().toString(),order.getOrderId(),order.getBuyerEmail(),order.getBuyerPhone(),type,message,LocalDateTime.now());
    }

    private void audit(UserEntity actor, OrderEntity order, String action, String reason) {
        jdbc.update("""
            INSERT INTO ADMIN_ACCOUNT_AUDIT
              (AUDIT_ID, ACTOR_USER_ID, ACTOR_EMAIL, TARGET_USER_ID, TARGET_EMAIL,
               ACTION, PREVIOUS_STATUS, NEW_STATUS, REASON, OCCURRED_AT)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, UUID.randomUUID().toString(), actor.getUserId(), actor.getEmail(),
                order.getOrderId(), order.getBuyerEmail(), action, order.getStatus(), order.getStatus(),
                reason == null ? action : reason, LocalDateTime.now());
    }
    private static String safe(String s) { return s == null ? "" : s; }
    private static String value(Map<String, String> body, String key, String fallback) {
        return body != null && body.containsKey(key) ? safe(body.get(key)).trim() : safe(fallback).trim();
    }
}
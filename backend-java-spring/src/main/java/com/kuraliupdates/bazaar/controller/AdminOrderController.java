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
        if (!changed.isEmpty()) audit(actor, saved, "ORDER_DETAILS_UPDATE", "Updated: " + String.join(", ", changed));
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
            audit(actor, order, "ORDER_CANCELLED", body == null ? "Cancelled by administrator" : body.getOrDefault("reason", "Cancelled by administrator"));
        }
        orders.saveAll(group);
        return OrderResponse.from(group.stream().filter(o -> orderId.equals(o.getOrderId())).findFirst().orElseThrow());
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
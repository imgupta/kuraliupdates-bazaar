package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicInteger;
import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
public class DeliveryService {
    private static final Set<String> VEHICLE_TYPES = Set.of("Bike", "Scooter", "Electric Bike", "Auto / Van");

    private final DeliveryAgentRepository agentRepository;
    private final OrderRepository orderRepository;
    private final JdbcTemplate jdbc;
    private final GoogleRoutesService googleRoutesService;
    private static final String DELIVERY_OTP_RESEND_GUARD_MERGE = """
            MERGE INTO API_RATE_LIMIT_BUCKETS target
            USING (
                SELECT ? AS BUCKET_KEY, TIMESTAMP '1970-01-01 00:00:00' AS WINDOW_START FROM DUAL
            ) source
            ON (target.BUCKET_KEY = source.BUCKET_KEY AND target.WINDOW_START = source.WINDOW_START)
            WHEN MATCHED THEN UPDATE SET
                target.REQUEST_COUNT = 1,
                target.EXPIRES_AT = SYSTIMESTAMP + INTERVAL '60' SECOND
                WHERE target.EXPIRES_AT <= SYSTIMESTAMP
            WHEN NOT MATCHED THEN INSERT (BUCKET_KEY, WINDOW_START, REQUEST_COUNT, EXPIRES_AT)
                VALUES (source.BUCKET_KEY, source.WINDOW_START, 1, SYSTIMESTAMP + INTERVAL '60' SECOND)
            """;
    private static final String DELIVERY_OTP_RESEND_GUARD_CLEANUP =
            "DELETE FROM API_RATE_LIMIT_BUCKETS WHERE EXPIRES_AT < SYSTIMESTAMP";

    private final AtomicInteger resendGuardCleanupCounter = new AtomicInteger();
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public DeliveryAgentEntity register(DeliveryAgentEntity request) {
        if (request.getPhone() == null || request.getEmail() == null || request.getFullName() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Name, phone and email are required");
        }
        if (!VEHICLE_TYPES.contains(request.getVehicleType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported vehicle type");
        }
        if (agentRepository.findByPhone(request.getPhone()).isPresent()
                || agentRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "A delivery partner already exists with this phone or email");
        }

        LocalDateTime now = LocalDateTime.now();
        request.setAgentId("agent-" + UUID.randomUUID().toString().substring(0, 8));
        request.setStatus("PENDING");
        request.setRating(BigDecimal.ZERO);
        request.setTotalTrips(0);
        request.setTodayEarnings(BigDecimal.ZERO);
        request.setTotalEarnings(BigDecimal.ZERO);
        request.setRegisteredAt(now);
        return agentRepository.save(request);
    }

    @Transactional
    public DeliveryAgentEntity updateAvailability(com.kuraliupdates.bazaar.entity.UserEntity user, boolean available) {
        DeliveryAgentEntity agent = findAgentForUser(user);
        requireActive(agent);
        agent.setAvailableForJobs(available);
        return agentRepository.save(agent);
    }

    @Transactional(readOnly = true)
    public DeliveryAgentEntity currentAgent(com.kuraliupdates.bazaar.entity.UserEntity user) {
        return findAgentForUser(user);
    }

    @Transactional(readOnly = true)
    public List<OrderEntity> availableJobs(com.kuraliupdates.bazaar.entity.UserEntity user) {
        DeliveryAgentEntity agent = findAgentForUser(user);
        requireActive(agent);
        if (Boolean.FALSE.equals(agent.getAvailableForJobs())) return List.of();
        List<OrderEntity> readyOrders = orderRepository.findByStatus("READY_FOR_PICKUP").stream()
                .filter(order -> !"STORE_PICKUP".equalsIgnoreCase(order.getFulfilmentMode()))
                .filter(order -> order.getDeliveryAgent() == null)
                .toList();
        Set<String> checkoutGroups = readyOrders.stream()
                .map(OrderEntity::getCheckoutGroupId).filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        Set<String> completeGroupIds = checkoutGroups.stream().filter(groupId -> {
            List<OrderEntity> group = orderRepository.findByCheckoutGroupIdOrderByPlacedAtAsc(groupId);
            return group.size() >= 2 && group.stream().allMatch(order ->
                    "READY_FOR_PICKUP".equals(order.getStatus())
                    && order.getDeliveryAgent() == null
                    && !"STORE_PICKUP".equalsIgnoreCase(order.getFulfilmentMode()));
        }).collect(java.util.stream.Collectors.toSet());
        // A checkoutGroupId is also assigned to single-seller checkouts. Those
        // must remain claimable as ordinary single-order jobs; only true
        // multi-seller groups wait until every seller order is ready.
        return readyOrders.stream().filter(order -> {
            if (order.getCheckoutGroupId() == null) return true;
            List<OrderEntity> group = orderRepository.findByCheckoutGroupIdOrderByPlacedAtAsc(order.getCheckoutGroupId());
            return group.size() == 1 || completeGroupIds.contains(order.getCheckoutGroupId());
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderEntity> assignedJobs(com.kuraliupdates.bazaar.entity.UserEntity user) {
        DeliveryAgentEntity agent = findAgentForUser(user);
        requireActive(agent);
        return orderRepository.findByDeliveryAgent_AgentId(agent.getAgentId()).stream()
                .filter(order -> "ASSIGNED_TO_DELIVERY".equalsIgnoreCase(order.getStatus())
                        || "PICKED_UP".equalsIgnoreCase(order.getStatus()))
                .filter(order -> !"STORE_PICKUP".equalsIgnoreCase(order.getFulfilmentMode()))
                .toList();
    }

    @Transactional
    public OrderEntity claim(String orderId, String agentId, com.kuraliupdates.bazaar.entity.UserEntity user) {
        DeliveryAgentEntity authenticatedAgent = findAgentForUser(user);
        requireActive(authenticatedAgent);
        requireAvailable(authenticatedAgent);
        if (!authenticatedAgent.getAgentId().equals(agentId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only claim orders for your own delivery profile");
        }

        // Serialize competing claims so only one active agent can win a READY_FOR_PICKUP order.
        OrderEntity order = orderRepository.findLockedByOrderId(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        if ("STORE_PICKUP".equalsIgnoreCase(order.getFulfilmentMode())) {
            throw new ApiException(HttpStatus.CONFLICT, "Store-pickup orders are collected by the buyer and cannot be claimed by a rider");
        }
        if (!"READY_FOR_PICKUP".equals(order.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Order is not available for pickup");
        }

        order.setDeliveryAgent(authenticatedAgent);
        order.setStatus("ASSIGNED_TO_DELIVERY");
        order.setCombinedDeliveryBatchId(null);
        if (order.getRiderPayoutSnapshot() == null) {
            BigDecimal base = configuredPayout("RIDER_BASE_PAYOUT", BigDecimal.valueOf(45));
            BigDecimal perKm = configuredPayout("RIDER_PER_KM_PAYOUT", BigDecimal.valueOf(22));
            BigDecimal distance = order.getDistanceKm() == null ? BigDecimal.ZERO : order.getDistanceKm();
            order.setRiderPayoutSnapshot(base.add(distance.multiply(perKm)).setScale(2, java.math.RoundingMode.HALF_UP));
            order.setRiderPayoutSnapshottedAt(LocalDateTime.now());
        }
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    @Transactional
    public List<OrderEntity> claimCheckoutGroup(String checkoutGroupId, String agentId,
            com.kuraliupdates.bazaar.entity.UserEntity user) {
        DeliveryAgentEntity agent = findAgentForUser(user);
        requireActive(agent);
        requireAvailable(agent);
        if (!agent.getAgentId().equals(agentId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only claim jobs for your own delivery profile");
        }
        Integer batchEnabled = jdbc.queryForObject(
                "SELECT BATCH_ENABLED FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID=1", Integer.class);
        if (!Integer.valueOf(1).equals(batchEnabled)) {
            throw new ApiException(HttpStatus.CONFLICT, "Combined delivery is currently disabled");
        }
        List<OrderEntity> orders = orderRepository.findLockedByCheckoutGroupId(checkoutGroupId);
        if (orders.size() < 2) throw new ApiException(HttpStatus.NOT_FOUND, "Combined checkout was not found");
        Integer maxSellers = jdbc.queryForObject(
                "SELECT MAX_SELLERS_PER_BATCH FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID=1", Integer.class);
        if (maxSellers != null && orders.size() > maxSellers) {
            throw new ApiException(HttpStatus.CONFLICT, "This checkout exceeds the configured combined-delivery seller limit");
        }
        if (orders.stream().anyMatch(o -> "STORE_PICKUP".equalsIgnoreCase(o.getFulfilmentMode()))) {
            throw new ApiException(HttpStatus.CONFLICT, "Store-pickup checkout cannot be claimed by a rider");
        }
        if (orders.stream().anyMatch(o -> !"READY_FOR_PICKUP".equals(o.getStatus()) || o.getDeliveryAgent() != null)) {
            throw new ApiException(HttpStatus.CONFLICT, "Every seller order must be ready and unassigned before a combined claim");
        }
        BigDecimal routeKm = googleRoutesService.calculateCombinedRouteKm(orders);
        if (routeKm == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "A verified Google Maps road route is unavailable. Claim these seller orders as separate delivery jobs.");
        }
        BigDecimal maxRouteKm = jdbc.queryForObject(
                "SELECT MAX_ROUTE_KM FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID=1", BigDecimal.class);
        if (maxRouteKm != null && routeKm.compareTo(maxRouteKm) > 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Combined road route exceeds the configured limit. Claim these seller orders as separate delivery jobs.");
        }
        String sharedOtp = String.format("%04d", secureRandom.nextInt(10_000));
        LocalDateTime now = LocalDateTime.now();
        BigDecimal groupPayout = configuredPayout("RIDER_BASE_PAYOUT", BigDecimal.valueOf(45))
                .add(routeKm.multiply(configuredPayout("RIDER_PER_KM_PAYOUT", BigDecimal.valueOf(22))))
                .setScale(2, java.math.RoundingMode.HALF_UP);
        for (int i = 0; i < orders.size(); i++) {
            OrderEntity order = orders.get(i);
            order.setDeliveryAgent(agent);
            order.setStatus("ASSIGNED_TO_DELIVERY");
            order.setDeliveryOtp(sharedOtp);
            order.setCombinedDeliveryBatchId(checkoutGroupId);
            order.setDistanceKm(i == 0 ? routeKm : BigDecimal.ZERO);
            order.setRiderPayoutSnapshot(i == 0 ? groupPayout : BigDecimal.ZERO);
            order.setRiderPayoutSnapshottedAt(now);
            order.setUpdatedAt(now);
        }
        return orderRepository.saveAll(orders);
    }

    /** Confirms collection at one seller stop without completing the whole checkout. */
    @Transactional
    public OrderEntity confirmSellerPickup(String orderId, com.kuraliupdates.bazaar.entity.UserEntity user) {
        DeliveryAgentEntity agent = findAgentForUser(user);
        requireActive(agent);
        OrderEntity order = orderRepository.findLockedByOrderId(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Seller order not found"));
        if (order.getDeliveryAgent() == null
                || !order.getDeliveryAgent().getAgentId().equals(agent.getAgentId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This pickup is not assigned to your delivery profile");
        }
        if (!"ASSIGNED_TO_DELIVERY".equals(order.getStatus()) && !"PICKED_UP".equals(order.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "This seller order is not awaiting pickup");
        }
        order.setStatus("PICKED_UP");
        order.setFulfilmentStatus("PICKED_UP_BY_RIDER");
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    @Transactional
    public Map<String, Object> resendDeliveryOtp(String orderId, com.kuraliupdates.bazaar.entity.UserEntity user) {
        DeliveryAgentEntity authenticatedAgent = findAgentForUser(user);
        requireActive(authenticatedAgent);
        OrderEntity order = orderRepository.findLockedByOrderId(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        if (order.getDeliveryAgent() == null
                || !order.getDeliveryAgent().getAgentId().equals(authenticatedAgent.getAgentId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This order is not assigned to your delivery profile");
        }
        if (!"ASSIGNED_TO_DELIVERY".equals(order.getStatus()) && !"PICKED_UP".equals(order.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Delivery OTP can only be resent for an active delivery");
        }

        boolean combined = order.getCombinedDeliveryBatchId() != null;
        if (combined && !order.getCombinedDeliveryBatchId().equals(order.getCheckoutGroupId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Combined delivery group reference is inconsistent");
        }

        List<OrderEntity> group = List.of();
        if (combined) {
            group = orderRepository.findLockedByCheckoutGroupId(order.getCheckoutGroupId());
            if (group.size() < 2 || group.stream().noneMatch(item -> orderId.equals(item.getOrderId()))) {
                throw new ApiException(HttpStatus.CONFLICT, "Combined delivery group is no longer available");
            }
            for (OrderEntity groupedOrder : group) {
                if (!order.getCombinedDeliveryBatchId().equals(groupedOrder.getCombinedDeliveryBatchId())
                        || groupedOrder.getDeliveryAgent() == null
                        || !groupedOrder.getDeliveryAgent().getAgentId().equals(authenticatedAgent.getAgentId())
                        || (!"ASSIGNED_TO_DELIVERY".equals(groupedOrder.getStatus())
                            && !"PICKED_UP".equals(groupedOrder.getStatus()))) {
                    throw new ApiException(HttpStatus.CONFLICT, "Combined delivery group is no longer consistently assigned");
                }
            }
        }

        // The database guard is shared by every application instance and uses the
        // database clock. The old ConcurrentHashMap cooldown was process-local and
        // reset on restart, so separate Render instances could resend immediately.
        String resendKey = combined
                ? "batch:" + order.getCombinedDeliveryBatchId()
                : "order:" + orderId;
        requireDeliveryOtpResendAllowed(resendKey);

        String newOtp = String.format("%04d", secureRandom.nextInt(10_000));
        LocalDateTime now = LocalDateTime.now();
        if (combined) {
            for (OrderEntity groupedOrder : group) {
                groupedOrder.setDeliveryOtp(newOtp);
                groupedOrder.setUpdatedAt(now);
            }
            orderRepository.saveAll(group);
        } else {
            order.setDeliveryOtp(newOtp);
            order.setUpdatedAt(now);
            orderRepository.save(order);
        }
        return Map.of("success", true, "message", "A new delivery OTP is now available in the customer app.");
    }

    private void requireDeliveryOtpResendAllowed(String rawKey) {
        String resendKey = hashDeliveryOtpResendKey(rawKey);
        int updated;
        try {
            updated = jdbc.update(DELIVERY_OTP_RESEND_GUARD_MERGE, resendKey);
        } catch (DuplicateKeyException firstInsertRace) {
            // Two instances may both observe no guard row. Retry once after the
            // winning transaction inserts the unique RESEND_KEY.
            try {
                updated = jdbc.update(DELIVERY_OTP_RESEND_GUARD_MERGE, resendKey);
            } catch (DataAccessException retryFailure) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Delivery OTP resend protection is temporarily unavailable");
            }
        } catch (DataAccessException databaseFailure) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Delivery OTP resend protection is temporarily unavailable");
        }
        if (updated == 0) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait 60 seconds before resending the delivery OTP");
        }

        if (resendGuardCleanupCounter.incrementAndGet() % 100 == 0) {
            try {
                jdbc.update(DELIVERY_OTP_RESEND_GUARD_CLEANUP);
            } catch (DataAccessException ignored) {
                // Expired rows are safe to retain temporarily; cleanup must not
                // fail a successfully guarded OTP resend.
            }
        }
    }

    private String hashDeliveryOtpResendKey(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(("delivery-otp-resend\n" + value).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    @Transactional
    public Map<String, Object> verifyDeliveryOtp(String orderId, String enteredOtp, com.kuraliupdates.bazaar.entity.UserEntity user) {
        DeliveryAgentEntity authenticatedAgent = findAgentForUser(user);
        requireActive(authenticatedAgent);
        if (enteredOtp == null || !enteredOtp.matches("\\d{4}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Delivery OTP must be 4 digits");
        }

        // Serialize verification for a given order. The lock ensures a concurrent
        // replay cannot pass the status check and credit payout a second time.
        OrderEntity order = orderRepository.findLockedForDeliveryVerification(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        DeliveryAgentEntity agent = order.getDeliveryAgent();
        if (agent == null) {
            throw new ApiException(HttpStatus.CONFLICT, "Order has not been assigned to a delivery partner");
        }
        if (!agent.getAgentId().equals(authenticatedAgent.getAgentId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This order is not assigned to your delivery profile");
        }
        if ("DELIVERED".equals(order.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Order has already been delivered");
        }
        if (!"PICKED_UP".equals(order.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Confirm collection from the seller before completing customer delivery");
        }
        if (!enteredOtp.equals(order.getDeliveryOtp())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid Delivery OTP");
        }

        List<OrderEntity> checkoutOrders = order.getCheckoutGroupId() == null
                ? List.of(order)
                : orderRepository.findLockedByCheckoutGroupId(order.getCheckoutGroupId());
        boolean combinedClaim = checkoutOrders.size() > 1 && checkoutOrders.stream().allMatch(deliveryOrder ->
                order.getCheckoutGroupId().equals(deliveryOrder.getCombinedDeliveryBatchId())
                && deliveryOrder.getDeliveryAgent() != null
                && deliveryOrder.getDeliveryAgent().getAgentId().equals(authenticatedAgent.getAgentId())
                && enteredOtp.equals(deliveryOrder.getDeliveryOtp())
                && "PICKED_UP".equals(deliveryOrder.getStatus()));
        if (order.getCombinedDeliveryBatchId() != null && !combinedClaim) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Collect every seller order in this combined route before completing the customer delivery");
        }
        // Separate-job fallback remains valid: only complete the individually assigned order.
        List<OrderEntity> deliveryOrders = combinedClaim ? checkoutOrders : List.of(order);
        LocalDateTime deliveredAt = LocalDateTime.now();
        for (OrderEntity deliveryOrder : deliveryOrders) {
            deliveryOrder.setStatus("DELIVERED");
            deliveryOrder.setPaymentStatus("COD".equalsIgnoreCase(deliveryOrder.getPaymentMethod())
                    ? "PAID" : deliveryOrder.getPaymentStatus());
            deliveryOrder.setUpdatedAt(deliveredAt);
        }
        if (combinedClaim) orderRepository.saveAll(deliveryOrders);
        else orderRepository.save(order);

        BigDecimal payout;
        if (deliveryOrders.stream().allMatch(deliveryOrder -> deliveryOrder.getRiderPayoutSnapshot() != null)) {
            payout = deliveryOrders.stream().map(OrderEntity::getRiderPayoutSnapshot)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            // Backward compatibility for orders claimed before payout snapshots were introduced.
            BigDecimal distance = deliveryOrders.stream().map(OrderEntity::getDistanceKm)
                    .filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            payout = configuredPayout("RIDER_BASE_PAYOUT", BigDecimal.valueOf(45))
                    .add(distance.multiply(configuredPayout("RIDER_PER_KM_PAYOUT", BigDecimal.valueOf(22))))
                    .setScale(2, java.math.RoundingMode.HALF_UP);
            deliveryOrders.forEach(deliveryOrder -> {
                deliveryOrder.setRiderPayoutSnapshot(BigDecimal.ZERO);
                deliveryOrder.setRiderPayoutSnapshottedAt(deliveredAt);
            });
            deliveryOrders.get(0).setRiderPayoutSnapshot(payout);
        }
        agent.setTotalTrips(agent.getTotalTrips() + 1);
        agent.setTodayEarnings(agent.getTodayEarnings().add(payout));
        agent.setTotalEarnings(agent.getTotalEarnings().add(payout));
        agentRepository.save(agent);

        return Map.of("success", true, "message", "Delivery completed and configured rider payout credited.",
                "completedOrders", deliveryOrders.size());
    }

    private BigDecimal configuredPayout(String column, BigDecimal fallback) {
        BigDecimal value = jdbc.queryForObject("SELECT " + column + " FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID=1", BigDecimal.class);
        return value == null ? fallback : value;
    }

    private DeliveryAgentEntity findAgentForUser(com.kuraliupdates.bazaar.entity.UserEntity user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authenticated user is required");
        }
        Optional<DeliveryAgentEntity> agent = user.getEmail() == null
                ? Optional.empty()
                : agentRepository.findByEmail(user.getEmail().trim().toLowerCase());
        if (agent.isEmpty() && user.getPhone() != null) {
            agent = agentRepository.findByPhone(user.getPhone().trim().replaceAll("\\D", ""));
        }
        return agent.orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "No delivery profile is linked to this account"));
    }

    private void requireAvailable(DeliveryAgentEntity agent) {
        if (Boolean.FALSE.equals(agent.getAvailableForJobs())) {
            throw new ApiException(HttpStatus.CONFLICT, "You are offline. Switch to Online to accept new delivery jobs.");
        }
    }

    private void requireActive(DeliveryAgentEntity agent) {
        if (!"ACTIVE".equalsIgnoreCase(agent.getStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Delivery partner approval is required before accessing pickup jobs");
        }
    }
}

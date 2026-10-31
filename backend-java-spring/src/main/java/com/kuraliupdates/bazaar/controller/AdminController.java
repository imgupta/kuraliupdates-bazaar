package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.admin.AdminBuyerResponse;
import com.kuraliupdates.bazaar.dto.admin.AdminAnalyticsResponse;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import java.math.BigDecimal;
import java.util.HashMap;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.SearchTrendRepository;
import com.kuraliupdates.bazaar.dto.admin.AdminSearchTrendResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpServiceAdminRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpServiceAdminResponse;
import com.kuraliupdates.bazaar.service.DailyHelpService;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalRepository;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalResponse;
import org.springframework.data.domain.PageRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Operations & Analytics Microservice", description = "Seller approval workflow, city analytics & demand insights")
public class AdminController {

    private final SellerRepository sellerRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final UserRepository userRepository;
    private final SearchTrendRepository searchTrendRepository;
    private final DailyHelpService dailyHelpService;
    private final DailyHelpProfessionalRepository dailyHelpProfessionalRepository;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/buyers")
    @Operation(summary = "Get registered buyer accounts for the root admin")
    public ResponseEntity<List<AdminBuyerResponse>> getBuyers() {
        List<AdminBuyerResponse> buyers = userRepository.findByRoleIgnoreCaseOrderByCreatedAtDesc("BUYER")
                .stream()
                .map(user -> new AdminBuyerResponse(
                        user.getUserId(),
                        user.getName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getLocality(),
                        user.getAddress(),
                        user.getFormattedAddress(),
                        user.getIsVerified(),
                        user.getCreatedAt(),
                        user.getLastLogin()))
                .toList();
        return ResponseEntity.ok(buyers);
    }

    @GetMapping("/sellers")
    @Operation(summary = "Get all seller accounts from the database")
    public ResponseEntity<List<SellerEntity>> getAllSellers() {
        return ResponseEntity.ok(sellerRepository.findAll());
    }

    @GetMapping("/delivery")
    @Operation(summary = "Get all delivery partners from the database")
    public ResponseEntity<List<DeliveryAgentEntity>> getAllDeliveryAgents() {
        return ResponseEntity.ok(deliveryAgentRepository.findAll());
    }

    @GetMapping("/analytics/demand-trends")
    @Operation(summary = "Get admin analytics derived from current database records")
    @Transactional(readOnly = true)
    public ResponseEntity<AdminAnalyticsResponse> getDemandAnalytics() {
        List<SellerEntity> sellers = sellerRepository.findAll();
        List<OrderEntity> orders = orderRepository.findAll();
        Map<String, Long> productCounts = new HashMap<>();
        productRepository.findAll().forEach(p -> productCounts.merge(p.getCategory(), 1L, Long::sum));

        Map<String, Long> orderCounts = new HashMap<>();
        Map<String, BigDecimal> revenue = new HashMap<>();
        Map<String, Long> localitySellers = new HashMap<>();
        Map<String, Long> localityProducts = new HashMap<>();
        Map<String, Long> localityOrders = new HashMap<>();

        sellers.forEach(s -> localitySellers.merge(s.getLocality(), 1L, Long::sum));
        productRepository.findAll().forEach(p -> localityProducts.merge(p.getSeller().getLocality(), 1L, Long::sum));
        BigDecimal totalGmv = BigDecimal.ZERO;
        for (OrderEntity order : orders) {
            String category = order.getSeller().getCategory();
            orderCounts.merge(category, 1L, Long::sum);
            BigDecimal amount = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
            revenue.merge(category, amount, BigDecimal::add);
            totalGmv = totalGmv.add(amount);
            localityOrders.merge(order.getDeliveryLocality(), 1L, Long::sum);
        }

        List<AdminAnalyticsResponse.CategoryMetric> categories = productCounts.entrySet().stream()
                .map(e -> new AdminAnalyticsResponse.CategoryMetric(e.getKey(), e.getValue(),
                        orderCounts.getOrDefault(e.getKey(), 0L), revenue.getOrDefault(e.getKey(), BigDecimal.ZERO)))
                .sorted((a, b) -> Long.compare(b.productCount(), a.productCount()))
                .toList();
        List<AdminAnalyticsResponse.LocalityMetric> localities = localitySellers.keySet().stream()
                .map(l -> new AdminAnalyticsResponse.LocalityMetric(l, localitySellers.getOrDefault(l, 0L),
                        localityProducts.getOrDefault(l, 0L), localityOrders.getOrDefault(l, 0L)))
                .sorted((a, b) -> Long.compare(b.productCount(), a.productCount()))
                .toList();

        return ResponseEntity.ok(new AdminAnalyticsResponse(
                sellers.size(),
                sellers.stream().filter(s -> "APPROVED".equalsIgnoreCase(s.getStatus())).count(),
                productRepository.count(),
                orders.size(),
                totalGmv,
                userRepository.findByRoleIgnoreCaseOrderByCreatedAtDesc("BUYER").size(),
                deliveryAgentRepository.findByStatus("ACTIVE").size(),
                categories,
                localities));
    }

    @GetMapping("/analytics/search-trends")
    @Operation(summary = "Get top database-backed buyer search trends")
    public ResponseEntity<List<AdminSearchTrendResponse>> getSearchTrends() {
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        List<AdminSearchTrendResponse> trends = searchTrendRepository.findTopSearchesSince(since, PageRequest.of(0, 20))
                .stream()
                .map(metric -> new AdminSearchTrendResponse(metric.getQuery(), metric.getSearchCount()))
                .toList();
        return ResponseEntity.ok(trends);
    }

    @GetMapping("/sellers/pending")
    @Operation(summary = "Get list of newly registered sellers waiting for Admin Approval")
    public ResponseEntity<List<SellerEntity>> getPendingSellers() {
        return ResponseEntity.ok(sellerRepository.findByStatusNormalized("PENDING"));
    }

    @PostMapping("/sellers/{sellerId}/approve")
    @Operation(summary = "Admin approves Kurali store to publish inventory & start selling")
    public ResponseEntity<SellerEntity> approveSeller(@PathVariable String sellerId) {
        return sellerRepository.findById(sellerId).map(seller -> {
            seller.setStatus("APPROVED");
            seller.setApprovedAt(LocalDateTime.now());
            return ResponseEntity.ok(sellerRepository.save(seller));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/sellers/{sellerId}/reject")
    @Operation(summary = "Admin rejects Kurali store registration")
    public ResponseEntity<SellerEntity> rejectSeller(@PathVariable String sellerId) {
        return sellerRepository.findById(sellerId).map(seller -> {
            seller.setStatus("REJECTED");
            return ResponseEntity.ok(sellerRepository.save(seller));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/delivery/pending")
    @Operation(summary = "Get delivery partners waiting for Admin Approval")
    public ResponseEntity<List<DeliveryAgentEntity>> getPendingDeliveryAgents() {
        return ResponseEntity.ok(deliveryAgentRepository.findByStatus("PENDING"));
    }

    @PostMapping("/delivery/{agentId}/approve")
    @Operation(summary = "Admin approves Kurali Express delivery partner")
    public ResponseEntity<DeliveryAgentEntity> approveDeliveryAgent(@PathVariable String agentId) {
        return deliveryAgentRepository.findById(agentId).map(agent -> {
            agent.setStatus("ACTIVE");
            return ResponseEntity.ok(deliveryAgentRepository.save(agent));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/delivery/{agentId}/reject")
    @Operation(summary = "Admin rejects Kurali Express delivery partner")
    public ResponseEntity<DeliveryAgentEntity> rejectDeliveryAgent(@PathVariable String agentId) {
        return deliveryAgentRepository.findById(agentId).map(agent -> {
            agent.setStatus("REJECTED");
            return ResponseEntity.ok(deliveryAgentRepository.save(agent));
        }).orElse(ResponseEntity.notFound().build());
    }


    @GetMapping("/daily-help/helpers")
    @Operation(summary = "Get all Daily Help professionals/helpers for admin")
    public ResponseEntity<List<DailyHelpProfessionalResponse>> getDailyHelpHelpers() {
        return ResponseEntity.ok(dailyHelpProfessionalRepository.findAll().stream()
                .map(DailyHelpProfessionalResponse::from)
                .toList());
    }


    @PostMapping("/daily-help/helpers/{professionalId}/verification")
    @Operation(summary = "Approve or revoke a Daily Help professional's verification")
    public ResponseEntity<DailyHelpProfessionalResponse> updateDailyHelpProfessionalVerification(
            @PathVariable String professionalId,
            @RequestParam boolean verified) {
        return ResponseEntity.ok(dailyHelpService.updateProfessionalVerification(professionalId, verified));
    }

    @PostMapping("/daily-help/helpers/{professionalId}/availability")
    @Operation(summary = "Set a Daily Help professional's availability from the admin desk")
    public ResponseEntity<DailyHelpProfessionalResponse> updateDailyHelpProfessionalAvailability(
            @PathVariable String professionalId,
            @jakarta.validation.Valid @RequestBody com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalAvailabilityRequest request) {
        return ResponseEntity.ok(dailyHelpService.updateProfessionalAvailability(professionalId, request));
    }

    @GetMapping("/daily-help/services")
    @Operation(summary = "Get all Daily Help services for admin management")
    public ResponseEntity<List<DailyHelpServiceAdminResponse>> getDailyHelpServices() {
        return ResponseEntity.ok(dailyHelpService.getAllServicesForAdmin());
    }

    @PostMapping("/daily-help/services")
    @Operation(summary = "Create a Daily Help service")
    public ResponseEntity<DailyHelpServiceAdminResponse> createDailyHelpService(
            @jakarta.validation.Valid @RequestBody DailyHelpServiceAdminRequest request) {
        return ResponseEntity.ok(dailyHelpService.createService(request));
    }

    @PutMapping("/daily-help/services/{serviceId}")
    @Operation(summary = "Update a Daily Help service and its hourly rate")
    public ResponseEntity<DailyHelpServiceAdminResponse> updateDailyHelpService(
            @PathVariable String serviceId,
            @jakarta.validation.Valid @RequestBody DailyHelpServiceAdminRequest request) {
        return ResponseEntity.ok(dailyHelpService.updateService(serviceId, request));
    }



    /**
     * Unified account directory for root-admin support. Role profiles remain
     * separate records, but account status applies to the linked identity and
     * invalidates its existing sessions immediately.
     */
    @GetMapping("/accounts")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getAccountDirectory(
            @RequestParam(required = false) String search) {
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        List<Map<String, Object>> result = new ArrayList<>();
        for (var user : userRepository.findAllByOrderByCreatedAtDesc()) {
            List<String> roles = new ArrayList<>();
            roles.add("BUYER");
            if (sellerRepository.findByEmailIgnoreCase(user.getEmail()).isPresent()) roles.add("SELLER");
            if (deliveryAgentRepository.findByEmail(user.getEmail()).isPresent()) roles.add("DELIVERY");
            if (dailyHelpProfessionalRepository.findByPhone(user.getPhone()).isPresent()) roles.add("DAILY_HELP");
            if ("ADMIN".equalsIgnoreCase(user.getRole()) || Integer.valueOf(1).equals(user.getIsAdmin())) roles.add("ADMIN");
            String haystack = String.join(" ", String.valueOf(user.getUserId()), String.valueOf(user.getName()),
                    String.valueOf(user.getEmail()), String.valueOf(user.getPhone()), String.join(" ", roles)).toLowerCase(Locale.ROOT);
            if (!term.isEmpty() && !haystack.contains(term)) continue;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("userId", user.getUserId());
            row.put("name", user.getName());
            row.put("email", user.getEmail());
            row.put("phone", user.getPhone());
            row.put("locality", user.getLocality());
            row.put("roles", roles);
            row.put("accountStatus", user.getAccountStatus() == null ? "ACTIVE" : user.getAccountStatus());
            row.put("statusReason", user.getAccountStatusReason());
            row.put("statusUpdatedAt", user.getAccountStatusUpdatedAt());
            row.put("createdAt", user.getCreatedAt());
            row.put("lastLogin", user.getLastLogin());
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/accounts/{userId}/status")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateAccountStatus(
            @PathVariable String userId, @RequestBody Map<String, String> request) {
        var target = userRepository.findById(userId).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication == null ? null : authentication.getPrincipal();
        com.kuraliupdates.bazaar.entity.UserEntity actor =
                principal instanceof com.kuraliupdates.bazaar.entity.UserEntity u ? u : null;
        if (actor == null) return ResponseEntity.status(403).body(Map.of("message", "Authenticated admin identity is required."));
        if (actor.getUserId().equals(target.getUserId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "You cannot suspend, revoke, or modify your own admin account."));
        }
        Set<String> rootAdmins = Set.of("shubham.gupta180296@gmail.com", "sg7508359237@gmail.com", "admin@kuraliupdates.com");
        if (target.getEmail() != null && rootAdmins.contains(target.getEmail().trim().toLowerCase(Locale.ROOT))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Root administrator accounts are protected from account-status changes."));
        }
        String newStatus = request.getOrDefault("status", "").trim().toUpperCase(Locale.ROOT);
        String reason = request.getOrDefault("reason", "").trim();
        if (!Set.of("ACTIVE", "SUSPENDED", "REVOKED").contains(newStatus)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Status must be ACTIVE, SUSPENDED, or REVOKED."));
        }
        if (!"ACTIVE".equals(newStatus) && reason.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "A reason is required for suspension or revocation."));
        }
        String previous = target.getAccountStatus() == null ? "ACTIVE" : target.getAccountStatus().toUpperCase(Locale.ROOT);
        target.setAccountStatus(newStatus);
        target.setAccountStatusReason(reason.isBlank() ? null : reason);
        target.setAccountStatusUpdatedAt(LocalDateTime.now());
        target.setAccountSuspendedUntil(null);
        userRepository.save(target);
        if (!"ACTIVE".equals(newStatus)) {
            // Immediate invalidation: all existing bearer tokens stop working.
            var sessions = jdbcTemplate.update("DELETE FROM USER_SESSIONS WHERE USER_ID = ?", target.getUserId());
        }
        jdbcTemplate.update("""
                INSERT INTO ADMIN_ACCOUNT_AUDIT
                  (AUDIT_ID, ACTOR_USER_ID, ACTOR_EMAIL, TARGET_USER_ID, TARGET_EMAIL,
                   ACTION, PREVIOUS_STATUS, NEW_STATUS, REASON, OCCURRED_AT)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID().toString(), actor.getUserId(), actor.getEmail(),
                target.getUserId(), target.getEmail(), "ACCOUNT_STATUS", previous, newStatus,
                reason.isBlank() ? null : reason, LocalDateTime.now());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("userId", target.getUserId());
        response.put("accountStatus", newStatus);
        response.put("statusReason", target.getAccountStatusReason());
        response.put("statusUpdatedAt", target.getAccountStatusUpdatedAt());
        response.put("sessionsRevoked", !"ACTIVE".equals(newStatus));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/accounts/{userId}/revoke-sessions")
    @Transactional
    public ResponseEntity<Map<String, Object>> revokeAccountSessions(@PathVariable String userId) {
        var target = userRepository.findById(userId).orElse(null);
        if (target == null) return ResponseEntity.notFound().build();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication == null ? null : authentication.getPrincipal();
        com.kuraliupdates.bazaar.entity.UserEntity actor =
                principal instanceof com.kuraliupdates.bazaar.entity.UserEntity u ? u : null;
        if (actor == null) return ResponseEntity.status(403).body(Map.of("message", "Authenticated admin identity is required."));
        if (actor.getUserId().equals(target.getUserId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "You cannot revoke your own admin session."));
        }
        int deleted = jdbcTemplate.update("DELETE FROM USER_SESSIONS WHERE USER_ID = ?", target.getUserId());
        jdbcTemplate.update("""
                INSERT INTO ADMIN_ACCOUNT_AUDIT
                  (AUDIT_ID, ACTOR_USER_ID, ACTOR_EMAIL, TARGET_USER_ID, TARGET_EMAIL,
                   ACTION, PREVIOUS_STATUS, NEW_STATUS, REASON, OCCURRED_AT)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID().toString(), actor.getUserId(), actor.getEmail(),
                target.getUserId(), target.getEmail(), "REVOKE_SESSIONS",
                target.getAccountStatus(), target.getAccountStatus(), "Admin revoked active sessions", LocalDateTime.now());
        return ResponseEntity.ok(Map.of("userId", userId, "sessionsRevoked", deleted));
    }

    @GetMapping("/accounts/{userId}/audit")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getAccountAudit(@PathVariable String userId) {
        if (!userRepository.existsById(userId)) return ResponseEntity.notFound().build();
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("""
                SELECT AUDIT_ID AS "auditId", ACTOR_USER_ID AS "actorUserId",
                       ACTOR_EMAIL AS "actorEmail", TARGET_USER_ID AS "targetUserId",
                       TARGET_EMAIL AS "targetEmail", ACTION AS "action",
                       PREVIOUS_STATUS AS "previousStatus", NEW_STATUS AS "newStatus",
                       REASON AS "reason", OCCURRED_AT AS "occurredAt"
                  FROM ADMIN_ACCOUNT_AUDIT WHERE TARGET_USER_ID = ?
                 ORDER BY OCCURRED_AT DESC
                """, userId);
        return ResponseEntity.ok(rows);
    }


    @GetMapping("/delivery/configuration")
    @Transactional(readOnly = true)
    @Operation(summary = "Read multi-seller delivery configuration")
    public ResponseEntity<Map<String, Object>> getDeliveryConfiguration() {
        return ResponseEntity.ok(jdbcTemplate.queryForMap("""
                SELECT NEARBY_RADIUS_KM AS "nearbyRadiusKm",
                       MAX_SELLERS_PER_BATCH AS "maxSellersPerBatch",
                       MAX_ROUTE_KM AS "maxRouteKm",
                       CUSTOMER_BASE_FEE AS "customerBaseFee",
                       CUSTOMER_PER_KM_FEE AS "customerPerKmFee",
                       RIDER_BASE_PAYOUT AS "riderBasePayout",
                       RIDER_PER_KM_PAYOUT AS "riderPerKmPayout",
                       MAX_WAIT_MINUTES AS "maxWaitMinutes",
                       BATCH_ENABLED AS "batchEnabled",
                       FLEXIBLE_FALLBACK AS "flexibleFallback",
                       STORE_PICKUP_ENABLED AS "storePickupEnabled",
                       UPDATED_AT AS "updatedAt"
                  FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID = 1
                """));
    }

    @PutMapping("/delivery/configuration")
    @Transactional
    @Operation(summary = "Update multi-seller delivery configuration")
    public ResponseEntity<Map<String, Object>> updateDeliveryConfiguration(
            @RequestBody Map<String, Object> payload) {
        BigDecimal radius = configDecimal(payload, "nearbyRadiusKm", new BigDecimal("0.5"), new BigDecimal("50"));
        BigDecimal maxSellersValue = configDecimal(payload, "maxSellersPerBatch", BigDecimal.ONE, BigDecimal.TEN);
        BigDecimal maxRoute = configDecimal(payload, "maxRouteKm", BigDecimal.ONE, new BigDecimal("100"));
        BigDecimal customerBase = configDecimal(payload, "customerBaseFee", BigDecimal.ZERO, new BigDecimal("10000"));
        BigDecimal customerPerKm = configDecimal(payload, "customerPerKmFee", BigDecimal.ZERO, new BigDecimal("1000"));
        BigDecimal riderBase = configDecimal(payload, "riderBasePayout", BigDecimal.ZERO, new BigDecimal("10000"));
        BigDecimal riderPerKm = configDecimal(payload, "riderPerKmPayout", BigDecimal.ZERO, new BigDecimal("1000"));
        BigDecimal wait = configDecimal(payload, "maxWaitMinutes", BigDecimal.ZERO, new BigDecimal("120"));
        int maxSellers = maxSellersValue.intValueExact();
        int batch = configFlag(payload, "batchEnabled");
        int fallback = configFlag(payload, "flexibleFallback");
        int pickup = configFlag(payload, "storePickupEnabled");
        jdbcTemplate.update("""
                UPDATE DELIVERY_CONFIGURATION
                   SET NEARBY_RADIUS_KM=?, MAX_SELLERS_PER_BATCH=?, MAX_ROUTE_KM=?,
                       CUSTOMER_BASE_FEE=?, CUSTOMER_PER_KM_FEE=?, RIDER_BASE_PAYOUT=?,
                       RIDER_PER_KM_PAYOUT=?, MAX_WAIT_MINUTES=?, BATCH_ENABLED=?,
                       FLEXIBLE_FALLBACK=?, STORE_PICKUP_ENABLED=?, UPDATED_AT=CURRENT_TIMESTAMP
                 WHERE CONFIG_ID=1
                """, radius, maxSellers, maxRoute, customerBase, customerPerKm, riderBase,
                riderPerKm, wait.intValueExact(), batch, fallback, pickup);
        return getDeliveryConfiguration();
    }

    @PostMapping("/sellers/{sellerId}/location")
    @Transactional
    @Operation(summary = "Set and verify seller store coordinates")
    public ResponseEntity<Map<String, Object>> verifySellerLocation(
            @PathVariable String sellerId, @RequestBody Map<String, Object> payload) {
        SellerEntity seller = sellerRepository.findById(sellerId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Seller not found"));
        Object latValue = payload.get("latitude");
        Object lngValue = payload.get("longitude");
        boolean verified = Boolean.TRUE.equals(payload.get("verified"));
        if (latValue != null || lngValue != null) {
            if (!(latValue instanceof Number) || !(lngValue instanceof Number)) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST, "Both numeric latitude and longitude are required");
            }
            double lat = ((Number) latValue).doubleValue();
            double lng = ((Number) lngValue).doubleValue();
            if (!Double.isFinite(lat) || !Double.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST, "Coordinates are outside valid latitude/longitude ranges");
            }
            seller.setLatitude(BigDecimal.valueOf(lat));
            seller.setLongitude(BigDecimal.valueOf(lng));
        }
        if (verified && (seller.getLatitude() == null || seller.getLongitude() == null)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Coordinates must be saved before verification");
        }
        seller.setLocationVerified(verified);
        sellerRepository.save(seller);
        return ResponseEntity.ok(Map.of("sellerId", sellerId, "latitude", seller.getLatitude() == null ? "" : seller.getLatitude(),
                "longitude", seller.getLongitude() == null ? "" : seller.getLongitude(), "locationVerified", verified));
    }

    private BigDecimal configDecimal(Map<String, Object> payload, String key, BigDecimal min, BigDecimal max) {
        Object value = payload.get(key);
        if (!(value instanceof Number number)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, key + " must be numeric");
        }
        BigDecimal parsed = new BigDecimal(number.toString());
        if (parsed.compareTo(min) < 0 || parsed.compareTo(max) > 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, key + " must be between " + min + " and " + max);
        }
        return parsed;
    }

    private int configFlag(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (!(value instanceof Boolean flag)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, key + " must be true or false");
        }
        return flag ? 1 : 0;
    }

}

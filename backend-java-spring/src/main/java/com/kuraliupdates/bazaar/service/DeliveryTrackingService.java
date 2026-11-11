package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.UserSessionEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import com.kuraliupdates.bazaar.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DeliveryTrackingService {
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final OrderRepository orderRepository;
    private final UserSessionRepository sessionRepository;
    private final UserRepository userRepository;

    @Transactional
    public Map<String, Object> updateLocation(String agentId, double latitude, double longitude, String token) {
        if (!isDeliverySessionForAgent(agentId, token)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Valid delivery session required");
        }
        validateCoordinate(latitude, longitude);

        DeliveryAgentEntity agent = deliveryAgentRepository.findById(agentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Delivery partner not found"));

        LocalDateTime now = LocalDateTime.now();
        if (agent.getCurrentLatitude() != null && agent.getCurrentLongitude() != null
                && agent.getLocationUpdatedAt() != null
                && agent.getLocationUpdatedAt().plusSeconds(10).isAfter(now)
                && distanceMeters(agent.getCurrentLatitude().doubleValue(), agent.getCurrentLongitude().doubleValue(), latitude, longitude) < 15) {
            return locationResponse(agent, false);
        }

        agent.setCurrentLatitude(BigDecimal.valueOf(latitude));
        agent.setCurrentLongitude(BigDecimal.valueOf(longitude));
        agent.setLocationUpdatedAt(now);
        deliveryAgentRepository.save(agent);
        return locationResponse(agent, true);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getOrderTracking(String orderId, String token) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        if (!isAuthorizedForOrder(order, token)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not authorized to track this order");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("orderId", orderId);
        result.put("status", order.getStatus());
        result.put("buyerLatitude", order.getDeliveryLatitude());
        result.put("buyerLongitude", order.getDeliveryLongitude());
        result.put("buyerAddress", order.getDeliveryAddress());
        result.put("buyerLocality", order.getDeliveryLocality());
        result.put("sellerName", order.getSeller() == null ? null : order.getSeller().getStoreName());
        result.put("sellerAddress", order.getSeller() == null ? null : order.getSeller().getAddress());
        result.put("sellerLocality", order.getSeller() == null ? null : order.getSeller().getLocality());

        // Delivery verification OTP is visible only to the authenticated order owner.
        String authenticatedEmail = sessionRepository.findBySessionToken(token)
                .filter(this::active)
                .filter(session -> "BUYER".equals(sessionRole(session)))
                .map(session -> userEmail(session.getUserId()))
                .orElse("");
        if (order.getBuyerEmail() != null && order.getBuyerEmail().equalsIgnoreCase(authenticatedEmail)) {
            result.put("deliveryOtp", order.getDeliveryOtp());
        }

        DeliveryAgentEntity agent = order.getDeliveryAgent();
        if (agent != null) {
            result.put("agentId", agent.getAgentId());
            result.put("agentName", agent.getFullName());
            result.put("agentLatitude", agent.getCurrentLatitude());
            result.put("agentLongitude", agent.getCurrentLongitude());
            result.put("agentLocationUpdatedAt", agent.getLocationUpdatedAt());
        }
        return result;
    }

    private boolean isDeliverySessionForAgent(String agentId, String token) {
        if (token == null || token.isBlank()) return false;
        return sessionRepository.findBySessionToken(token)
                .filter(this::active)
                .filter(session -> "DELIVERY".equals(sessionRole(session)))
                .flatMap(session -> deliveryAgentRepository.findById(agentId)
                        .map(agent -> matchesActiveAgentSession(agent, session)))
                .orElse(false);
    }

    private boolean isAuthorizedForOrder(OrderEntity order, String token) {
        if (token == null || token.isBlank()) return false;
        return sessionRepository.findBySessionToken(token)
                .filter(this::active)
                .map(session -> {
                    String role = sessionRole(session);
                    String email = userEmail(session.getUserId());
                    boolean buyer = "BUYER".equals(role) && order.getBuyerEmail() != null
                            && order.getBuyerEmail().equalsIgnoreCase(email);
                    // A rider's persisted user link is authoritative. Email is only a
                    // compatibility fallback for legacy profiles that predate USER_ID.
                    boolean rider = "DELIVERY".equals(role) && order.getDeliveryAgent() != null
                            && riderTrackingIsActive(order)
                            && matchesActiveAgentSession(order.getDeliveryAgent(), session);
                    return buyer || rider;
                }).orElse(false);
    }

    private String sessionRole(UserSessionEntity session) {
        if (session.getActiveRole() != null && !session.getActiveRole().isBlank()) {
            return session.getActiveRole().trim().toUpperCase(java.util.Locale.ROOT);
        }
        if (session.getUserId() == null || session.getUserId().isBlank()) return "";
        return userRepository.findById(session.getUserId())
                .map(user -> user.getRole() == null ? "" : user.getRole().trim().toUpperCase(java.util.Locale.ROOT))
                .orElse("");
    }

    private boolean riderTrackingIsActive(OrderEntity order) {
        // Match the delivery work queue: riders may view location/address only
        // while an assigned job is in progress, not after delivery completion.
        return "ASSIGNED_TO_DELIVERY".equalsIgnoreCase(order.getStatus())
                || "PICKED_UP".equalsIgnoreCase(order.getStatus());
    }

    private boolean matchesActiveAgentSession(DeliveryAgentEntity agent, UserSessionEntity session) {
        if (agent == null || session == null || session.getUserId() == null
                || !"ACTIVE".equalsIgnoreCase(agent.getStatus())) {
            return false;
        }
        String linkedUserId = agent.getUserId();
        if (linkedUserId != null && !linkedUserId.isBlank()) {
            return linkedUserId.equals(session.getUserId());
        }
        // Legacy delivery profiles may not yet have USER_ID populated. Keep the
        // email fallback only for those rows; never let it override a conflicting link.
        String authenticatedEmail = userEmail(session.getUserId());
        return agent.getEmail() != null && !authenticatedEmail.isBlank()
                && agent.getEmail().equalsIgnoreCase(authenticatedEmail);
    }

    private boolean active(UserSessionEntity session) {
        return session != null && session.getUserId() != null && !session.getUserId().isBlank()
                && session.getExpiresAt() != null
                && session.getExpiresAt().isAfter(LocalDateTime.now());
    }

    private String userEmail(String userId) {
        return userRepository.findById(userId).map(u -> u.getEmail()).orElse("");
    }

    private Map<String, Object> locationResponse(DeliveryAgentEntity agent, boolean stored) {
        return Map.of("success", true, "agentId", agent.getAgentId(),
                "latitude", agent.getCurrentLatitude(), "longitude", agent.getCurrentLongitude(),
                "updatedAt", agent.getLocationUpdatedAt(), "stored", stored);
    }

    private void validateCoordinate(double latitude, double longitude) {
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Valid latitude and longitude are required");
        }
    }

    private double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        final double earthRadiusMeters = 6_371_000;
        double lat1Rad = Math.toRadians(lat1), lat2Rad = Math.toRadians(lat2);
        double deltaLat = Math.toRadians(lat2 - lat1), deltaLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
                + Math.cos(lat1Rad) * Math.cos(lat2Rad)
                * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}

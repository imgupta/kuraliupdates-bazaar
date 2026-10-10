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

        // Delivery verification OTP is visible only to the authenticated order owner.
        String authenticatedEmail = sessionRepository.findBySessionToken(token)
                .filter(this::active)
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
                .flatMap(session -> deliveryAgentRepository.findById(agentId)
                        .map(agent -> agent.getEmail().equalsIgnoreCase(userEmail(session.getUserId()))))
                .orElse(false);
    }

    private boolean isAuthorizedForOrder(OrderEntity order, String token) {
        if (token == null || token.isBlank()) return false;
        return sessionRepository.findBySessionToken(token)
                .filter(this::active)
                .map(session -> {
                    String email = userEmail(session.getUserId());
                    boolean buyer = order.getBuyerEmail() != null && order.getBuyerEmail().equalsIgnoreCase(email);
                    boolean rider = order.getDeliveryAgent() != null && order.getDeliveryAgent().getEmail().equalsIgnoreCase(email);
                    return buyer || rider;
                }).orElse(false);
    }

    private boolean active(UserSessionEntity session) {
        return session.getExpiresAt().isAfter(LocalDateTime.now());
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

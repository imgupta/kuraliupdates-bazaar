package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.UserSessionRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tracking")
@RequiredArgsConstructor
public class DeliveryTrackingController {
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final OrderRepository orderRepository;
    private final UserSessionRepository userSessionRepository;
    private final UserRepository userRepository;

    @PostMapping("/delivery/{agentId}/location")
    public ResponseEntity<Map<String, Object>> updateDeliveryLocation(
            @PathVariable String agentId,
            @RequestBody LocationRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (!isDeliverySessionForAgent(agentId, authorization)) return error(HttpStatus.UNAUTHORIZED, "Valid delivery session required");
        if (!validCoordinate(request.latitude(), request.longitude())) {
            return error(HttpStatus.BAD_REQUEST, "Valid latitude and longitude are required");
        }
        DeliveryAgentEntity agent = deliveryAgentRepository.findById(agentId).orElse(null);
        if (agent == null) return error(HttpStatus.NOT_FOUND, "Delivery partner not found");

        LocalDateTime now = LocalDateTime.now();
        BigDecimal latitude = BigDecimal.valueOf(request.latitude());
        BigDecimal longitude = BigDecimal.valueOf(request.longitude());

        // Protect the database even if a client sends GPS updates more frequently
        // than the frontend policy. Skip writes for tiny movements within 10 seconds.
        if (agent.getCurrentLatitude() != null
                && agent.getCurrentLongitude() != null
                && agent.getLocationUpdatedAt() != null
                && agent.getLocationUpdatedAt().plusSeconds(10).isAfter(now)
                && distanceMeters(
                        agent.getCurrentLatitude().doubleValue(),
                        agent.getCurrentLongitude().doubleValue(),
                        request.latitude(),
                        request.longitude()) < 15) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "agentId", agentId,
                    "latitude", agent.getCurrentLatitude(),
                    "longitude", agent.getCurrentLongitude(),
                    "updatedAt", agent.getLocationUpdatedAt(),
                    "stored", false
            ));
        }

        agent.setCurrentLatitude(latitude);
        agent.setCurrentLongitude(longitude);
        agent.setLocationUpdatedAt(now);
        deliveryAgentRepository.save(agent);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "agentId", agentId,
                "latitude", request.latitude(),
                "longitude", request.longitude(),
                "updatedAt", agent.getLocationUpdatedAt(),
                "stored", true
        ));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<Map<String, Object>> getOrderTracking(@PathVariable String orderId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        OrderEntity order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return error(HttpStatus.NOT_FOUND, "Order not found");
        if (!isAuthorizedForOrder(order, authorization)) return error(HttpStatus.FORBIDDEN, "You are not authorized to track this order");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("orderId", orderId);
        result.put("status", order.getStatus());
        result.put("buyerLatitude", order.getDeliveryLatitude());
        result.put("buyerLongitude", order.getDeliveryLongitude());
        result.put("buyerAddress", order.getDeliveryAddress());

        DeliveryAgentEntity agent = order.getDeliveryAgent();
        if (agent != null) {
            result.put("agentId", agent.getAgentId());
            result.put("agentName", agent.getFullName());
            result.put("agentLatitude", agent.getCurrentLatitude());
            result.put("agentLongitude", agent.getCurrentLongitude());
            result.put("agentLocationUpdatedAt", agent.getLocationUpdatedAt());
        }
        return ResponseEntity.ok(result);
    }

    private boolean isDeliverySessionForAgent(String agentId, String authorization) {
        String token = extractToken(authorization);
        if (token == null) return false;
        return userSessionRepository.findBySessionToken(token)
                .filter(s -> s.getExpiresAt().isAfter(LocalDateTime.now()))
                .flatMap(s -> deliveryAgentRepository.findById(agentId)
                        .map(agent -> agent.getEmail().equalsIgnoreCase(findUserEmail(s.getUserId()))))
                .orElse(false);
    }

    private boolean isAuthorizedForOrder(OrderEntity order, String authorization) {
        String token = extractToken(authorization);
        if (token == null) return false;
        return userSessionRepository.findBySessionToken(token)
                .filter(s -> s.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(s -> order.getBuyerEmail() != null && order.getBuyerEmail().equalsIgnoreCase(findUserEmail(s.getUserId())))
                .orElse(false);
    }

    private String findUserEmail(String userId) {
        return userRepository.findById(userId).map(u -> u.getEmail()).orElse("");
    }

    private String extractToken(String authorization) {
        return authorization != null && authorization.startsWith("Bearer ") ? authorization.substring(7).trim() : null;
    }

    private boolean validCoordinate(Double lat, Double lng) {
        return lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    private double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        final double earthRadiusMeters = 6_371_000;
        double lat1Rad = Math.toRadians(lat1);
        double lat2Rad = Math.toRadians(lat2);
        double deltaLat = Math.toRadians(lat2 - lat1);
        double deltaLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
                + Math.cos(lat1Rad) * Math.cos(lat2Rad)
                * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

        return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("success", false, "message", message));
    }

    public record LocationRequest(Double latitude, Double longitude) {}
}
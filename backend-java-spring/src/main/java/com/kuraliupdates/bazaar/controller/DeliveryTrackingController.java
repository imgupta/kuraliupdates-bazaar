package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.OrderRepository;
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

    @PostMapping("/delivery/{agentId}/location")
    public ResponseEntity<Map<String, Object>> updateDeliveryLocation(
            @PathVariable String agentId,
            @RequestBody LocationRequest request) {
        if (!validCoordinate(request.latitude(), request.longitude())) {
            return error(HttpStatus.BAD_REQUEST, "Valid latitude and longitude are required");
        }
        DeliveryAgentEntity agent = deliveryAgentRepository.findById(agentId).orElse(null);
        if (agent == null) return error(HttpStatus.NOT_FOUND, "Delivery partner not found");

        agent.setCurrentLatitude(BigDecimal.valueOf(request.latitude()));
        agent.setCurrentLongitude(BigDecimal.valueOf(request.longitude()));
        agent.setLocationUpdatedAt(LocalDateTime.now());
        deliveryAgentRepository.save(agent);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "agentId", agentId,
                "latitude", request.latitude(),
                "longitude", request.longitude(),
                "updatedAt", agent.getLocationUpdatedAt()
        ));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<Map<String, Object>> getOrderTracking(@PathVariable String orderId) {
        OrderEntity order = orderRepository.findById(orderId).orElse(null);
        if (order == null) return error(HttpStatus.NOT_FOUND, "Order not found");

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

    private boolean validCoordinate(Double lat, Double lng) {
        return lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("success", false, "message", message));
    }

    public record LocationRequest(Double latitude, Double longitude) {}
}
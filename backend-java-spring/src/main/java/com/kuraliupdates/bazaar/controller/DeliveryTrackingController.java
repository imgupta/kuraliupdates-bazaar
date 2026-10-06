package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.DeliveryTrackingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/tracking")
@RequiredArgsConstructor
public class DeliveryTrackingController {
    private final DeliveryTrackingService trackingService;

    @PostMapping("/delivery/{agentId}/location")
    public ResponseEntity<Map<String, Object>> updateDeliveryLocation(
            @PathVariable String agentId,
            @Valid @RequestBody LocationRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        return ResponseEntity.ok(trackingService.updateLocation(
                agentId, request.latitude(), request.longitude(), bearerToken(authorization)));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<Map<String, Object>> getOrderTracking(
            @PathVariable String orderId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        return ResponseEntity.ok(trackingService.getOrderTracking(orderId, bearerToken(authorization)));
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return null;
        String token = authorization.substring(7).trim();
        return token.isBlank() ? null : token;
    }

    public record LocationRequest(
            @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0") Double latitude,
            @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0") Double longitude
    ) {}
}

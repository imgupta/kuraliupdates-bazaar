package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.delivery.DeliveryRegistrationRequest;
import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.service.DeliveryService;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/delivery")
@RequiredArgsConstructor
@Tag(name = "Delivery API", description = "Delivery partner registration, job claiming and completion")
public class DeliveryController {
    private final DeliveryService deliveryService;

    @PostMapping("/register")
    @Operation(summary = "Register a delivery partner for admin approval")
    public ResponseEntity<DeliveryAgentEntity> registerAgent(@Valid @RequestBody DeliveryRegistrationRequest request) {
        DeliveryAgentEntity entity = DeliveryAgentEntity.builder()
                .fullName(request.fullName().trim())
                .phone(request.phone().trim())
                .email(request.email().trim().toLowerCase())
                .avatarUrl(request.avatarUrl())
                .vehicleType(request.vehicleType().trim())
                .vehicleNumber(request.vehicleNumber().trim().toUpperCase())
                .licenseNumber(request.licenseNumber().trim())
                .currentLocality(request.currentLocality().trim())
                .build();
        return ResponseEntity.ok(deliveryService.register(entity));
    }

    @GetMapping("/jobs/available")
    public ResponseEntity<List<OrderEntity>> getAvailableJobs() {
        return ResponseEntity.ok(deliveryService.availableJobs());
    }

    @PostMapping("/jobs/{orderId}/claim")
    public ResponseEntity<OrderEntity> claimJob(
            @PathVariable String orderId,
            @RequestParam String agentId) {
        return ResponseEntity.ok(deliveryService.claim(orderId, agentId));
    }

    @PostMapping("/jobs/{orderId}/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyDeliveryOtp(
            @PathVariable String orderId,
            @RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(deliveryService.verifyDeliveryOtp(orderId, payload.get("otp")));
    }
}

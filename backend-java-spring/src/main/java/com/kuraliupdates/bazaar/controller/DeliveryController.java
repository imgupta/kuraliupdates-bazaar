package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.delivery.DeliveryRegistrationRequest;
import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.dto.order.OrderResponse;
import com.kuraliupdates.bazaar.service.DeliveryService;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.entity.UserEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

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

    @GetMapping("/me")
    public ResponseEntity<DeliveryAgentEntity> currentAgent(Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(deliveryService.currentAgent(user));
    }

    @GetMapping("/jobs/available")
    @Transactional(readOnly = true)
    public ResponseEntity<List<OrderResponse>> getAvailableJobs(Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(deliveryService.availableJobs(user).stream().map(OrderResponse::from).toList());
    }

    @PostMapping("/jobs/{orderId}/claim")
    @Transactional
    public ResponseEntity<OrderResponse> claimJob(
            @PathVariable String orderId,
            @RequestParam String agentId,
            Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(OrderResponse.from(deliveryService.claim(orderId, agentId, user)));
    }

    @PostMapping("/jobs/{orderId}/resend-otp")
    public ResponseEntity<Map<String, Object>> resendDeliveryOtp(
            @PathVariable String orderId,
            Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(deliveryService.resendDeliveryOtp(orderId, user));
    }

    @PostMapping("/jobs/{orderId}/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyDeliveryOtp(
            @PathVariable String orderId,
            @RequestBody Map<String, String> payload,
            Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(deliveryService.verifyDeliveryOtp(orderId, payload.get("otp"), user));
    }

    private UserEntity requireUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity user)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "An authenticated delivery partner session is required");
        }
        return user;
    }
}

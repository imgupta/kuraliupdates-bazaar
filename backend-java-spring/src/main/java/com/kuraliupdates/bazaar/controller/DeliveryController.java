package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.dto.delivery.DeliveryJobResponse;
import com.kuraliupdates.bazaar.dto.delivery.AvailableDeliveryJobResponse;
import com.kuraliupdates.bazaar.service.DeliveryService;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.entity.UserEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
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
@Tag(name = "Delivery API", description = "Delivery partner job claiming and completion")
public class DeliveryController {
    private final DeliveryService deliveryService;

    @GetMapping("/me")
    public ResponseEntity<DeliveryAgentEntity> currentAgent(Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(deliveryService.currentAgent(user));
    }

    @PutMapping("/me/availability")
    public ResponseEntity<DeliveryAgentEntity> updateAvailability(
            @RequestBody Map<String, Boolean> payload, Authentication authentication) {
        Boolean available = payload == null ? null : payload.get("available");
        if (available == null) throw new ApiException(HttpStatus.BAD_REQUEST, "The available flag is required");
        return ResponseEntity.ok(deliveryService.updateAvailability(requireUser(authentication), available));
    }

    @GetMapping("/jobs/available")
    @Transactional(readOnly = true)
    public ResponseEntity<List<AvailableDeliveryJobResponse>> getAvailableJobs(Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(deliveryService.availableJobs(user).stream().map(AvailableDeliveryJobResponse::from).toList());
    }

    @GetMapping("/jobs/mine")
    @Transactional(readOnly = true)
    @Operation(summary = "Get active deliveries assigned to the authenticated delivery partner")
    public ResponseEntity<List<DeliveryJobResponse>> getMyAssignedJobs(Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(deliveryService.assignedJobs(user).stream().map(DeliveryJobResponse::from).toList());
    }

    @PostMapping("/jobs/{orderId}/claim")
    @Transactional
    public ResponseEntity<DeliveryJobResponse> claimJob(
            @PathVariable String orderId,
            @RequestParam String agentId,
            Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(DeliveryJobResponse.from(deliveryService.claim(orderId, agentId, user)));
    }

    @PostMapping("/jobs/checkout/{checkoutGroupId}/claim")
    @Transactional
    @Operation(summary = "Atomically claim every ready seller order in a route-feasible combined checkout")
    public ResponseEntity<List<DeliveryJobResponse>> claimCheckoutGroup(
            @PathVariable String checkoutGroupId,
            @RequestParam String agentId,
            Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(deliveryService.claimCheckoutGroup(checkoutGroupId, agentId, user)
                .stream().map(DeliveryJobResponse::from).toList());
    }

    @PostMapping("/jobs/{orderId}/confirm-pickup")
    @Transactional
    @Operation(summary = "Confirm collection at one seller pickup stop")
    public ResponseEntity<DeliveryJobResponse> confirmSellerPickup(
            @PathVariable String orderId, Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(DeliveryJobResponse.from(deliveryService.confirmSellerPickup(orderId, user)));
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
        if (authentication.getAuthorities() == null || authentication.getAuthorities().stream()
                .noneMatch(authority -> "ROLE_DELIVERY".equalsIgnoreCase(authority.getAuthority()))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "An active delivery partner session is required");
        }
        return user;
    }
}

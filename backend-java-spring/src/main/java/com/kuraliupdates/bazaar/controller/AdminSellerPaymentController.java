package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.SellerDirectPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/payment-destinations")
@RequiredArgsConstructor
public class AdminSellerPaymentController {
    private final SellerDirectPaymentService payments;

    @GetMapping
    public ResponseEntity<List<Map<String,Object>>> list(@RequestParam(required=false) String status) {
        return ResponseEntity.ok(payments.adminDestinations(status));
    }

    @GetMapping("/cod-settings")
    public ResponseEntity<List<Map<String,Object>>> codSettings() {
        return ResponseEntity.ok(payments.codSettings());
    }

    @PutMapping("/{sellerId}/cod")
    public ResponseEntity<Map<String,Object>> updateCod(@PathVariable String sellerId,
            @RequestBody Map<String,Object> body, Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UserEntity admin)
                || auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).noneMatch(a -> "ROLE_ADMIN".equalsIgnoreCase(a)))
            throw new ApiException(HttpStatus.FORBIDDEN, "An active admin session is required");
        boolean enabled = body != null && Boolean.TRUE.equals(body.get("enabled"));
        return ResponseEntity.ok(payments.updateCodEnabled(sellerId, enabled, admin.getEmail()));
    }

    @PostMapping("/{sellerId}/review")
    public ResponseEntity<Map<String,Object>> review(@PathVariable String sellerId,
            @RequestBody Map<String,Object> body, Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UserEntity admin)
                || auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).noneMatch(a -> "ROLE_ADMIN".equalsIgnoreCase(a)))
            throw new ApiException(HttpStatus.FORBIDDEN, "An active admin session is required");
        boolean approve = body != null && Boolean.TRUE.equals(body.get("approve"));
        boolean activate = body != null && Boolean.TRUE.equals(body.get("activate"));
        String reason = body == null ? null : String.valueOf(body.getOrDefault("reason", ""));
        return ResponseEntity.ok(payments.reviewDestination(sellerId, approve, activate, reason, admin.getEmail()));
    }
}

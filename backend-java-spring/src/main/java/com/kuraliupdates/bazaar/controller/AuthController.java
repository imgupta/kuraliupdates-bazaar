package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.address.AddressRequest;
import com.kuraliupdates.bazaar.dto.address.AddressResponse;
import com.kuraliupdates.bazaar.dto.auth.ProfileUpdateRequest;
import com.kuraliupdates.bazaar.dto.auth.SendOtpRequest;
import com.kuraliupdates.bazaar.dto.auth.UserResponse;
import com.kuraliupdates.bazaar.dto.auth.VerifyOtpRequest;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.BuyerAddressService;
import com.kuraliupdates.bazaar.exception.ApiException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final BuyerAddressService addressService;

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, Object>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        AuthService.OtpSendResult result =
                authService.sendOtp(request.identifier(), request.type(), request.mode());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "A 6-digit verification code has been sent",
                "identifier", result.identifier(),
                "type", result.type(),
                "expiresInSeconds", result.expiresInSeconds()
        ));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        AuthService.AuthResult result = authService.verifyOtp(request);
        return authResponse(result);
    }

    @GetMapping("/me/roles")
    public ResponseEntity<Map<String, Object>> registeredRoles(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "roles", authService.registeredRoles(bearerToken(authorization))
        ));
    }

    @GetMapping("/onboarding-status")
    public ResponseEntity<Map<String, Object>> onboardingStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        AuthService.OnboardingStatus status =
                authService.onboardingStatus(bearerToken(authorization));
        return ResponseEntity.ok(Map.of(
                "success", true,
                "role", status.role(),
                "status", status.status()
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> currentUser(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        UserResponse user = authService.currentUser(bearerToken(authorization));
        return userResponse(user);
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> updateCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody ProfileUpdateRequest request) {
        UserResponse user = authService.updateCurrentUser(bearerToken(authorization), request);
        return userResponse(user);
    }

    @GetMapping("/me/addresses")
    public ResponseEntity<List<AddressResponse>> getAddresses(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        UserResponse user = authService.currentUser(bearerToken(authorization));
        return ResponseEntity.ok(user.addresses());
    }

    @PostMapping("/me/addresses")
    public ResponseEntity<AddressResponse> createAddress(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody AddressRequest request) {
        String userId = authService.requireUser(bearerToken(authorization)).getUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(addressService.create(userId, request));
    }

    @PutMapping("/me/addresses/{addressId}")
    public ResponseEntity<AddressResponse> updateAddress(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String addressId,
            @Valid @RequestBody AddressRequest request) {
        String userId = authService.requireUser(bearerToken(authorization)).getUserId();
        return addressService.update(userId, addressId, request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/me/addresses/{addressId}/default")
    public ResponseEntity<AddressResponse> setDefaultAddress(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String addressId) {
        String userId = authService.requireUser(bearerToken(authorization)).getUserId();
        return addressService.setDefault(userId, addressId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, String> body) {
        String token = bearerToken(authorization);
        if (token == null && body != null) token = body.get("token");
        authService.logout(token);
        return ResponseEntity.ok(Map.of("success", true, "message", "Successfully logged out"));
    }

    private ResponseEntity<Map<String, Object>> authResponse(AuthService.AuthResult result) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("authenticated", true);
        response.put("token", result.token());
        response.put("user", result.user());
        response.put("addresses", result.user().addresses());
        response.put("message", result.message());
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<Map<String, Object>> userResponse(UserResponse user) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "authenticated", true,
                "user", user,
                "addresses", user.addresses()
        ));
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return null;
        String token = authorization.substring(7).trim();
        return token.isBlank() ? null : token;
    }
}

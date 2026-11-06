package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.address.AddressRequest;
import com.kuraliupdates.bazaar.dto.address.AddressResponse;
import com.kuraliupdates.bazaar.dto.auth.ProfileUpdateRequest;
import com.kuraliupdates.bazaar.dto.auth.SendOtpRequest;
import com.kuraliupdates.bazaar.dto.auth.UserResponse;
import com.kuraliupdates.bazaar.dto.auth.VerifyOtpRequest;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.BuyerAddressService;
import com.kuraliupdates.bazaar.entity.PortalHandoffEntity;
import com.kuraliupdates.bazaar.repository.PortalHandoffRepository;
import com.kuraliupdates.bazaar.exception.ApiException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;
import java.security.SecureRandom;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;


@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;
    private final BuyerAddressService addressService;
    private final PortalHandoffRepository portalHandoffRepository;
    private static final long PORTAL_HANDOFF_TTL_SECONDS = 60;
    private static final SecureRandom HANDOFF_RANDOM = new SecureRandom();

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, Object>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        AuthService.OtpSendResult result =
                authService.sendOtp(request.identifier(), request.type(), request.mode());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "A 6-digit verification code has been sent",
                "identifier", result.identifier(),
                "type", result.type(),
                "expiresInSeconds", result.expiresInSeconds(),
                "resendAfterSeconds", result.resendAfterSeconds()
        ));
    }

    @PostMapping("/registration-check")
    public ResponseEntity<Map<String, Object>> registrationCheck(
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(authService.registrationCheck(
                request.get("email"), request.get("phone"), request.get("role")));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        AuthService.AuthResult result = authService.verifyOtp(request);
        return authResponse(result);
    }

    /**
     * Creates a short-lived, one-time code for moving an authenticated session
     * between the separate role portal origins. The bearer token is never placed
     * in the redirect URL.
     */
    @PostMapping("/portal-handoff")
    public ResponseEntity<Map<String, Object>> createPortalHandoff(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody(required = false) Map<String, String> body) {
        String token = bearerToken(authorization);
        if (token == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required to switch profiles");
        }
        String requestedRole = body == null ? null : body.get("role");
        String role = requestedRole == null ? "" : requestedRole.trim().toUpperCase();
        List<String> roles = authService.registeredRoles(token);
        if (role.isBlank() || !roles.contains(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is not authorized for that profile");
        }

        LocalDateTime now = LocalDateTime.now();
        portalHandoffRepository.deleteByExpiresAtBefore(now);
        byte[] randomCode = new byte[32];
        HANDOFF_RANDOM.nextBytes(randomCode);
        String code = HexFormat.of().formatHex(randomCode);
        portalHandoffRepository.save(PortalHandoffEntity.builder()
                .codeHash(sha256(code))
                .sessionToken(token)
                .role(role)
                .createdAt(now)
                .expiresAt(now.plusSeconds(PORTAL_HANDOFF_TTL_SECONDS))
                .build());
        return ResponseEntity.ok(Map.of("success", true, "code", code, "role", role,
                "expiresInSeconds", PORTAL_HANDOFF_TTL_SECONDS));
    }

    /** Redeems a handoff code once and returns the authenticated session to the target portal. */
    @PostMapping("/portal-handoff/redeem")
    public ResponseEntity<Map<String, Object>> redeemPortalHandoff(
            @RequestBody(required = false) Map<String, String> body) {
        String code = body == null ? null : body.get("code");
        if (code == null || code.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A portal handoff code is required");
        }
        LocalDateTime consumedAt = LocalDateTime.now();
        String codeHash = sha256(code);
        if (portalHandoffRepository.consume(codeHash, consumedAt) != 1) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "This profile-switch link has expired or was already used");
        }
        PortalHandoffEntity handoff = portalHandoffRepository.findById(codeHash)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "This profile-switch link is unavailable"));

        List<String> roles = authService.registeredRoles(handoff.getSessionToken());
        if (!roles.contains(handoff.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is no longer authorized for that profile");
        }
        UserResponse user = authService.currentUser(handoff.getSessionToken());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "authenticated", true,
                "token", handoff.getSessionToken(),
                "user", user,
                "addresses", user.addresses(),
                "roles", roles,
                "role", handoff.getRole()
        ));
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
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
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "role", required = false) String role) {
        AuthService.OnboardingStatus status =
                authService.onboardingStatus(bearerToken(authorization), role);
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

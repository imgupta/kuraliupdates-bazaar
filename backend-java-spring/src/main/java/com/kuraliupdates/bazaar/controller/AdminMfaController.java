package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AdminMfaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/admin/mfa")
@RequiredArgsConstructor
public class AdminMfaController {
    public static final String STEP_UP_COOKIE = "__Host-ku_admin_stepup";
    private static final Duration STEP_UP_TTL = Duration.ofMinutes(10);

    private final AdminMfaService adminMfaService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(
            @AuthenticationPrincipal UserEntity user,
            Authentication authentication,
            @CookieValue(name = STEP_UP_COOKIE, required = false) String stepUpToken) {
        AdminMfaService.Status status = adminMfaService.status(
                user.getUserId(), sessionToken(authentication), stepUpToken);
        return ResponseEntity.ok(Map.of("enabled", status.enabled(), "stepUpValid", status.stepUpValid()));
    }

    @PostMapping("/enroll")
    public ResponseEntity<AdminMfaService.Enrollment> beginEnrollment(@AuthenticationPrincipal UserEntity user) {
        return ResponseEntity.ok(adminMfaService.beginEnrollment(user.getUserId(), user.getEmail()));
    }

    @PostMapping("/confirm")
    public ResponseEntity<Map<String, Object>> confirmEnrollment(
            @AuthenticationPrincipal UserEntity user,
            Authentication authentication,
            @Valid @RequestBody CodeRequest request) {
        AdminMfaService.Confirmation confirmation = adminMfaService.confirmEnrollment(
                user.getUserId(), sessionToken(authentication), request.code());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, stepUpCookie(confirmation.stepUpToken()).toString())
                .body(Map.of("success", true, "recoveryCodes", confirmation.recoveryCodes()));
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyStepUp(
            @AuthenticationPrincipal UserEntity user,
            Authentication authentication,
            @Valid @RequestBody CodeRequest request) {
        String token = adminMfaService.verifyStepUp(user.getUserId(), sessionToken(authentication), request.code());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, stepUpCookie(token).toString())
                .body(Map.of("success", true, "message", "Administrator verification complete"));
    }

    private ResponseCookie stepUpCookie(String token) {
        return ResponseCookie.from(STEP_UP_COOKIE, token)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(STEP_UP_TTL)
                .build();
    }

    private String sessionToken(Authentication authentication) {
        if (authentication == null || !(authentication.getCredentials() instanceof String token) || token.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "An active admin session is required");
        }
        return token;
    }

    public record CodeRequest(@Pattern(regexp = "[A-Za-z0-9 -]{6,40}") String code) {}
}

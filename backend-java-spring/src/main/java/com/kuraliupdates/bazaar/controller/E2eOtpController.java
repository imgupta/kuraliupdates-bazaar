package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.E2eOtpCaptureService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/e2e/otp")
@ConditionalOnProperty(name = "app.e2e-otp.enabled", havingValue = "true")
public class E2eOtpController {
    private final E2eOtpCaptureService captureService;
    private final String environment;
    private final String token;

    public E2eOtpController(
            E2eOtpCaptureService captureService,
            @Value("${app.e2e-otp.environment:}") String environment,
            @Value("${app.e2e-otp.token:}") String token) {
        this.captureService = captureService;
        this.environment = environment == null ? "" : environment.trim().toLowerCase();
        this.token = token == null ? "" : token;
    }

    @GetMapping("/latest")
    public ResponseEntity<Map<String, Object>> latest(
            @RequestParam String identifier,
            @RequestHeader(value = "X-E2E-OTP-Token", required = false) String suppliedToken) {
        // Fail closed unless explicitly marked staging with a strong shared secret.
        if (!"staging".equals(environment) || token.length() < 32
                || !captureService.isSafelyConfigured() || !constantTimeEquals(token, suppliedToken)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Not found"));
        }
        if (identifier == null || identifier.isBlank() || identifier.length() > 254) {
            return ResponseEntity.badRequest().body(Map.of("message", "A valid test identity is required"));
        }
        return captureService.consume(identifier)
                .map(otp -> ResponseEntity.ok(Map.<String, Object>of("otp", otp, "expiresInSeconds", 180)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "No current OTP is available for this allowlisted test identity")));
    }

    private boolean constantTimeEquals(String expected, String actual) {
        if (actual == null) return false;
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }
}

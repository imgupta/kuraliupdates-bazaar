package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.auth.UserResponse;
import com.kuraliupdates.bazaar.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;

/**
 * Staging-only authentication helper for transactional Playwright flows.
 * The shared secret is never itself accepted as an application access token.
 */
@RestController
@RequestMapping("/e2e/auth")
public class E2eAuthController {
    private final AuthService authService;
    private final String environment;
    private final String configuredToken;
    private final String configuredIdentities;
    private final com.kuraliupdates.bazaar.service.E2eRunTagging e2eRunTagging;

    public E2eAuthController(
            AuthService authService,
            @Value("${E2E_FLOW_AUTH_ENV:}") String environment,
            @Value("${E2E_FLOW_AUTH_TOKEN:}") String configuredToken,
            @Value("${E2E_FLOW_AUTH_IDENTITIES:}") String configuredIdentities) {
        this.authService = authService;
        this.environment = environment == null ? "" : environment.trim().toLowerCase();
        this.configuredToken = configuredToken == null ? "" : configuredToken;
        this.configuredIdentities = configuredIdentities == null ? "" : configuredIdentities;
    }

    @PostMapping("/token")
    public ResponseEntity<Map<String, Object>> issueToken(
            @RequestHeader(value = "X-E2E-Flow-Token", required = false) String suppliedToken,
            @RequestHeader(value = "X-E2E-Run-Id", required = false) String runId,
            @RequestBody(required = false) Map<String, String> body) {
        // Missing configuration, non-staging deployments, or a weak secret all
        // make the endpoint indistinguishable from a missing route.
        if (!"staging".equals(environment) || configuredToken.length() < 32
                || !constantTimeEquals(configuredToken, suppliedToken)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .cacheControl(CacheControl.noStore())
                    .body(Map.of("message", "Not found"));
        }

        String identifier = body == null ? null : body.get("identifier");
        String role = body == null ? null : body.get("role");
        if (identifier == null || identifier.isBlank() || identifier.length() > 254
                || role == null || role.isBlank()) {
            return ResponseEntity.badRequest().cacheControl(CacheControl.noStore())
                    .body(Map.of("message", "A test identity and role are required"));
        }
        boolean allowlisted = java.util.Arrays.stream(configuredIdentities.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .anyMatch(value -> normalizeIdentity(value).equals(normalizeIdentity(identifier)));
        if (!allowlisted) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).cacheControl(CacheControl.noStore())
                    .body(Map.of("message", "Not found"));
        }

        String e2eRunId = e2eRunTagging.optionalRunId(runId, suppliedToken);
        AuthService.AuthResult result = authService.createStagingE2eSession(identifier, role, e2eRunId);
        List<String> roles = authService.registeredRoles(result.token());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of(
                "success", true,
                "authenticated", true,
                "token", result.token(),
                "user", result.user(),
                "roles", roles,
                "role", "PROVIDER".equalsIgnoreCase(role) ? "PROFESSIONAL" : role.trim().toUpperCase(),
                "message", result.message()
        ));
    }

    private String normalizeIdentity(String value) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.contains("@") ? trimmed.toLowerCase() : trimmed.replaceAll("\\D", "");
    }

    private boolean constantTimeEquals(String expected, String actual) {
        if (actual == null) return false;
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }
}

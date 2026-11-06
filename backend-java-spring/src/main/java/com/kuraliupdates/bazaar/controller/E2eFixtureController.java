package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.E2eFixtureService;
import com.kuraliupdates.bazaar.service.E2eRunTagging;
import com.kuraliupdates.bazaar.service.ApiRateLimitService;
import com.kuraliupdates.bazaar.exception.ApiException;
import org.springframework.http.HttpStatus;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Strong-token-protected staging-only synthetic fixture provisioning. */
@RestController
@RequestMapping("/e2e/fixtures")
@RequiredArgsConstructor
public class E2eFixtureController {
    private final E2eFixtureService fixtureService;
    private final E2eRunTagging runTagging;
    private final ApiRateLimitService rateLimit;

    @PostMapping("/prepare/{runId}")
    public ResponseEntity<E2eFixtureService.FixtureResult> prepare(
            @PathVariable String runId,
            @RequestHeader(value = "X-E2E-Flow-Token", required = false) String token,
            @RequestBody E2eFixtureService.PrepareRequest request) {
        runTagging.requireAuthorized(runId, token);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(fixtureService.prepare(runId, request));
    }
    @PostMapping("/rate-limit-probe/{runId}")
    public ResponseEntity<Map<String, Object>> verifyRateLimit(
            @PathVariable String runId,
            @RequestHeader(value = "X-E2E-Flow-Token", required = false) String token) {
        runTagging.requireAuthorized(runId, token);
        String probeKey = runId + ":" + UUID.randomUUID();
        boolean verified = false;
        try {
            rateLimit.requireAllowed("e2e-rate-limit-probe", probeKey, 1, Duration.ofMinutes(1));
            try {
                rateLimit.requireAllowed("e2e-rate-limit-probe", probeKey, 1, Duration.ofMinutes(1));
            } catch (ApiException expected) {
                if (expected.getStatus() == HttpStatus.TOO_MANY_REQUESTS) verified = true;
                else throw expected;
            }
        } finally {
            rateLimit.clearBucket("e2e-rate-limit-probe", probeKey);
        }
        if (verified) {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(Map.of("success", true, "rateLimitVerified", true));
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Rate limit probe did not enforce the configured bucket");
    }
}


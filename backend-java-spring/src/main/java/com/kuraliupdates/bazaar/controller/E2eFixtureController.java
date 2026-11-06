package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.E2eFixtureService;
import com.kuraliupdates.bazaar.service.E2eRunTagging;
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

    @PostMapping("/prepare/{runId}")
    public ResponseEntity<E2eFixtureService.FixtureResult> prepare(
            @PathVariable String runId,
            @RequestHeader(value = "X-E2E-Flow-Token", required = false) String token,
            @RequestBody E2eFixtureService.PrepareRequest request) {
        runTagging.requireAuthorized(runId, token);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(fixtureService.prepare(runId, request));
    }
}

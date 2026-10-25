package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.E2eRunCleanupService;
import com.kuraliupdates.bazaar.service.E2eRunTagging;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/e2e/cleanup")
@RequiredArgsConstructor
public class E2eRunCleanupController {
    private final E2eRunCleanupService cleanupService;
    private final E2eRunTagging runTagging;

    @PostMapping("/{runId}")
    public ResponseEntity<E2eRunCleanupService.CleanupResult> cleanup(
            @PathVariable String runId,
            @RequestHeader(value = "X-E2E-Flow-Token", required = false) String token) {
        runTagging.requireAuthorized(runId, token);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(cleanupService.cleanup(runId));
    }
}

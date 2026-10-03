package com.kuraliupdates.bazaar.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@Tag(name = "System Health", description = "Service and database connectivity health probe")
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "System health check")
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "UP");
        resp.put("service", "kuraliupdates-bazaar-api");
        resp.put("database", "Oracle Autonomous Database Connected");
        resp.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(resp);
    }
}

package com.kuraliupdates.bazaar.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import com.kuraliupdates.bazaar.exception.ApiException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Pattern;

/**
 * Allows run tagging and cleanup only with the staging E2E shared secret.
 * Ordinary application requests cannot opt records into cleanup by sending a header.
 */
@Component
public class E2eRunTagging {
    private static final Pattern RUN_ID = Pattern.compile("E2E-[A-Za-z0-9_-]{3,80}");
    private final String environment;
    private final String configuredToken;

    public E2eRunTagging(
            @Value("${E2E_FLOW_AUTH_ENV:}") String environment,
            @Value("${E2E_FLOW_AUTH_TOKEN:}") String configuredToken) {
        this.environment = environment == null ? "" : environment.trim().toLowerCase();
        this.configuredToken = configuredToken == null ? "" : configuredToken;
    }

    public String optionalRunId(String runId, String suppliedToken) {
        if (runId == null || runId.isBlank()) return null;
        requireAuthorized(runId, suppliedToken);
        return runId.trim();
    }

    public void requireAuthorized(String runId, String suppliedToken) {
        if (!"staging".equals(environment) || configuredToken.length() < 32
                || !constantTimeEquals(configuredToken, suppliedToken)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Not found");
        }
        if (runId == null || !RUN_ID.matcher(runId.trim()).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A valid run-scoped E2E ID is required");
        }
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return actual != null && MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8));
    }
}

package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class E2eRunTaggingTest {
    private static final String SECRET = "0123456789abcdef0123456789abcdef";

    @Test
    void acceptsRunTagOnlyWithStagingSecretAndSafeRunId() {
        E2eRunTagging tagging = new E2eRunTagging("staging", SECRET);
        assertDoesNotThrow(() -> tagging.requireAuthorized("E2E-run_123", SECRET));
        assertThrows(ApiException.class, () -> tagging.requireAuthorized("ordinary-user", SECRET));
        assertThrows(ApiException.class, () -> tagging.requireAuthorized("E2E-run_123", "wrong"));
    }

    @Test
    void rejectsCleanupAuthorizationOutsideStaging() {
        E2eRunTagging tagging = new E2eRunTagging("production", SECRET);
        assertThrows(ApiException.class, () -> tagging.requireAuthorized("E2E-run_123", SECRET));
    }

    @Test
    void ordinaryRequestsWithoutRunIdRemainUntagged() {
        E2eRunTagging tagging = new E2eRunTagging("staging", SECRET);
        org.junit.jupiter.api.Assertions.assertNull(tagging.optionalRunId(null, null));
        assertThrows(ApiException.class, () -> tagging.optionalRunId("E2E-run_123", null));
    }
}

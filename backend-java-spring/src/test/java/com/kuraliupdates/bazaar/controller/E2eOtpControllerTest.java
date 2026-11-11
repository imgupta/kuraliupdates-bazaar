package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.E2eOtpCaptureService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.*;

class E2eOtpControllerTest {
    private static final String TOKEN = "0123456789abcdef0123456789abcdef";

    @Test
    void readinessRequiresAuthorizedAllowlistedStagingIdentity() {
        var service = new E2eOtpCaptureService(true, "staging", "buyer@example.test");
        var controller = new E2eOtpController(service, "staging", TOKEN);

        assertEquals(HttpStatus.OK, controller.ready("buyer@example.test", TOKEN).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, controller.ready("other@example.test", TOKEN).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, controller.ready("buyer@example.test", "wrong-token").getStatusCode());
        assertTrue(controller.ready("buyer@example.test", TOKEN).getHeaders().getCacheControl().contains("no-store"));
    }

    @Test
    void readinessFailsClosedWhenCaptureIsDisabledOrNotStaging() {
        var disabled = new E2eOtpController(
                new E2eOtpCaptureService(false, "staging", "buyer@example.test"), "staging", TOKEN);
        var production = new E2eOtpController(
                new E2eOtpCaptureService(true, "production", "buyer@example.test"), "production", TOKEN);
        var weakToken = new E2eOtpController(
                new E2eOtpCaptureService(true, "staging", "buyer@example.test"), "staging", "short");

        assertEquals(HttpStatus.NOT_FOUND, disabled.ready("buyer@example.test", TOKEN).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, production.ready("buyer@example.test", TOKEN).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, weakToken.ready("buyer@example.test", TOKEN).getStatusCode());
    }

    @Test
    void capturedOtpIsOneTimeAndNeverCacheable() {
        var service = new E2eOtpCaptureService(true, "staging", "buyer@example.test");
        var controller = new E2eOtpController(service, "staging", TOKEN);
        service.capture("buyer@example.test", "012345");

        var response = controller.latest("buyer@example.test", TOKEN);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("012345", response.getBody().get("otp"));
        assertTrue(response.getHeaders().getCacheControl().contains("no-store"));
        assertEquals(HttpStatus.NOT_FOUND, controller.latest("buyer@example.test", TOKEN).getStatusCode());
    }
}

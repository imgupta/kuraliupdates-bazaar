package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.ApiRateLimitService;
import com.kuraliupdates.bazaar.service.SellerOnboardingLeadService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SellerOnboardingLeadControllerTest {
    @Mock private SellerOnboardingLeadService leads;
    @Mock private ApiRateLimitService rateLimit;
    @InjectMocks private SellerOnboardingLeadController controller;

    @Test
    void leadCreationIsRateLimitedByNormalizedContactBeforePersistence() {
        when(leads.start("Owner", "owner@example.com", "9876500000"))
                .thenReturn(Map.of("success", true, "status", "STARTED"));
        var result = controller.start(Map.of(
                "ownerName", "Owner",
                "email", "Owner@Example.com",
                "phone", "+91 98765 00000"));

        assertEquals("STARTED", result.get("status"));
        verify(rateLimit).requireAllowed("seller-lead-start", "owner@example.com:9876500000", 3,
                Duration.ofHours(1));
        verify(leads).start("Owner", "owner@example.com", "9876500000");
    }

    @Test
    void leadOtpAndCallbackActionsHaveIndependentLeadScopedBudgets() {
        controller.sendContactOtps("11111111-1111-4111-8111-111111111111");
        controller.verifyContact("11111111-1111-4111-8111-111111111111", Map.of("emailOtp", "123456", "phoneOtp", "654321"));
        controller.callback("11111111-1111-4111-8111-111111111111", Map.of("consent", true, "preferredTime", "Tomorrow morning"));

        verify(rateLimit).requireAllowed("seller-lead-send-otp", "11111111-1111-4111-8111-111111111111", 3, Duration.ofHours(1));
        verify(rateLimit).requireAllowed("seller-lead-verify", "11111111-1111-4111-8111-111111111111", 10, Duration.ofMinutes(15));
        verify(rateLimit).requireAllowed("seller-lead-callback", "11111111-1111-4111-8111-111111111111", 2, Duration.ofDays(1));
    }
}

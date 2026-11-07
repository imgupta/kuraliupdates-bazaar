package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SellerOnboardingLeadServiceTest {
    @Test
    void rejectsOversizedOwnerNameBeforeDatabaseAccess() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        OtpService otp = mock(OtpService.class);
        SellerRegistrationOtpConfigService config = mock(SellerRegistrationOtpConfigService.class);
        SellerOnboardingLeadService service = new SellerOnboardingLeadService(jdbc, otp, config);

        ApiException error = assertThrows(ApiException.class,
                () -> service.start("x".repeat(151), "owner@example.test", "9876500000"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(jdbc, otp, config);
    }

    @Test
    void rejectsOversizedEmailAndPhoneBeforeDatabaseAccess() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        OtpService otp = mock(OtpService.class);
        SellerRegistrationOtpConfigService config = mock(SellerRegistrationOtpConfigService.class);
        SellerOnboardingLeadService service = new SellerOnboardingLeadService(jdbc, otp, config);

        ApiException emailError = assertThrows(ApiException.class,
                () -> service.start("Owner", "a".repeat(255), "9876500000"));
        ApiException phoneError = assertThrows(ApiException.class,
                () -> service.start("Owner", "owner@example.test", "9".repeat(31)));

        assertEquals(HttpStatus.BAD_REQUEST, emailError.getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, phoneError.getStatus());
        verifyNoInteractions(jdbc, otp, config);
    }
    @Test
    void rejectsLeadCreationWhenBothContactVerificationChannelsAreDisabled() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        OtpService otp = mock(OtpService.class);
        SellerRegistrationOtpConfigService config = mock(SellerRegistrationOtpConfigService.class);
        when(config.get()).thenReturn(Map.of("emailOtpEnabled", false, "mobileOtpEnabled", false));
        SellerOnboardingLeadService service = new SellerOnboardingLeadService(jdbc, otp, config);

        ApiException error = assertThrows(ApiException.class,
                () -> service.start("Owner", "owner@example.test", "9876500000"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
        verify(config).get();
        verifyNoInteractions(jdbc, otp);
    }

    @Test
    void skippedOtpChannelsDoNotCountAsVerifiedContactWithoutOneActualVerification() {
        Map<String, Object> bothSkipped = Map.of(
                "emailVerified", false, "phoneVerified", false,
                "emailOtpSkipped", true, "phoneOtpSkipped", true);
        assertFalse(SellerOnboardingLeadService.contactRequirementSatisfied(bothSkipped, "email"));
        assertFalse(SellerOnboardingLeadService.contactRequirementSatisfied(bothSkipped, "phone"));
    }

    @Test
    void oneVerifiedChannelAllowsTheOtherDisabledChannelToBeSkipped() {
        Map<String, Object> emailVerified = Map.of(
                "emailVerified", true, "phoneVerified", false,
                "emailOtpSkipped", false, "phoneOtpSkipped", true);
        assertTrue(SellerOnboardingLeadService.contactRequirementSatisfied(emailVerified, "email"));
        assertTrue(SellerOnboardingLeadService.contactRequirementSatisfied(emailVerified, "phone"));
    }
}

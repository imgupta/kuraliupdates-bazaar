package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
    void reusingAnExistingLeadDoesNotOverwriteApplicantNameBeforeContactVerification() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        OtpService otp = mock(OtpService.class);
        SellerRegistrationOtpConfigService config = mock(SellerRegistrationOtpConfigService.class);
        when(config.get()).thenReturn(Map.of("emailOtpEnabled", true, "mobileOtpEnabled", false));
        when(jdbc.query(anyString(), org.mockito.ArgumentMatchers.<org.springframework.jdbc.core.ResultSetExtractor<String>>any(),
                any(Object[].class))).thenReturn("existing-lead-id");
        SellerOnboardingLeadService service = new SellerOnboardingLeadService(jdbc, otp, config);
        Map<String, Object> result = service.start("Attacker supplied name", "owner@example.test", "9876500000");
        assertEquals("STARTED", result.get("status"));
        assertEquals("existing-lead-id", result.get("leadId"));
        verify(jdbc, never()).update(startsWith("UPDATE SELLER_ONBOARDING_LEADS SET OWNER_NAME"), any(Object[].class));
        verify(jdbc, never()).update(startsWith("INSERT INTO SELLER_ONBOARDING_LEADS"), any(Object[].class));
    }

    @Test
    void contactVerificationCannotReplayAfterLeadHasAdvanced() {
        ApiException error = assertThrows(ApiException.class, () ->
                SellerOnboardingLeadService.requireLeadStatus(Map.of("status", "APPLICATION_SUBMITTED"),
                        "STARTED", "Contact verification is no longer available for this registration"));
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
    }

    @Test
    void callbackCanOnlyBeRequestedFromContactVerifiedState() {
        ApiException error = assertThrows(ApiException.class, () ->
                SellerOnboardingLeadService.requireLeadStatus(Map.of("status", "CALLBACK_REQUESTED"),
                        "CONTACT_VERIFIED", "This registration is not awaiting a callback"));
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
    }

    @Test
    void terminalLeadStateCannotBeMovedBackToContactVerified() {
        for (String status : java.util.List.of("APPLICATION_SUBMITTED", "CONVERTED", "NOT_INTERESTED")) {
            assertThrows(ApiException.class, () ->
                    SellerOnboardingLeadService.requireLeadStatus(Map.of("status", status),
                            "STARTED", "Contact verification is no longer available for this registration"));
        }
    }

    @Test
    void verifyContactRejectsAdvancedLeadBeforeOtpVerificationOrMutation() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        OtpService otp = mock(OtpService.class);
        SellerRegistrationOtpConfigService config = mock(SellerRegistrationOtpConfigService.class);
        stubLead(jdbc, "APPLICATION_SUBMITTED");
        SellerOnboardingLeadService service = new SellerOnboardingLeadService(jdbc, otp, config);
        ApiException error = assertThrows(ApiException.class,
                () -> service.verifyContact("lead-1", "123456", null));
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verifyNoInteractions(otp);
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void requestCallbackRejectsRepeatedCallbackBeforeMutation() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        OtpService otp = mock(OtpService.class);
        SellerRegistrationOtpConfigService config = mock(SellerRegistrationOtpConfigService.class);
        stubLead(jdbc, "CALLBACK_REQUESTED");
        SellerOnboardingLeadService service = new SellerOnboardingLeadService(jdbc, otp, config);
        ApiException error = assertThrows(ApiException.class,
                () -> service.requestCallback("lead-1", true, "Afternoon"));
        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
        verifyNoInteractions(otp);
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

    private static void stubLead(JdbcTemplate jdbc, String status) throws Exception {
        when(jdbc.query(
                eq("SELECT LEAD_ID,OWNER_NAME,EMAIL,PHONE,EMAIL_VERIFIED,PHONE_VERIFIED,EMAIL_OTP_REQUIRED,PHONE_OTP_REQUIRED,EMAIL_OTP_SKIPPED,PHONE_OTP_SKIPPED,CONTACT_CONSENT,STATUS,ASSIGNED_TO,CALLBACK_AT,APPLICATION_ID FROM SELLER_ONBOARDING_LEADS WHERE LEAD_ID=?"),
                org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
                any(Object[].class))).thenAnswer(invocation -> {
            RowMapper<Map<String, Object>> mapper = invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getString("LEAD_ID")).thenReturn("lead-1");
            when(rs.getString("OWNER_NAME")).thenReturn("Owner");
            when(rs.getString("EMAIL")).thenReturn("owner@example.test");
            when(rs.getString("PHONE")).thenReturn("9876500000");
            when(rs.getInt("EMAIL_VERIFIED")).thenReturn(0);
            when(rs.getInt("PHONE_VERIFIED")).thenReturn(0);
            when(rs.getInt("EMAIL_OTP_REQUIRED")).thenReturn(1);
            when(rs.getInt("PHONE_OTP_REQUIRED")).thenReturn(0);
            when(rs.getInt("EMAIL_OTP_SKIPPED")).thenReturn(0);
            when(rs.getInt("PHONE_OTP_SKIPPED")).thenReturn(1);
            when(rs.getInt("CONTACT_CONSENT")).thenReturn(0);
            when(rs.getString("STATUS")).thenReturn(status);
            when(rs.getString("ASSIGNED_TO")).thenReturn(null);
            when(rs.getTimestamp("CALLBACK_AT")).thenReturn(null);
            when(rs.getString("APPLICATION_ID")).thenReturn(null);
            return List.of(mapper.mapRow(rs, 0));
        });
    }
}

package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.config.SecurityConfig;
import com.kuraliupdates.bazaar.config.SessionAuthenticationFilter;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.SellerRegistrationOtpConfigService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = SellerRegistrationOtpConfigController.class)
@Import({SecurityConfig.class, SessionAuthenticationFilter.class})
class SellerRegistrationOtpConfigControllerSecurityTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private AuthService authService;
    @MockBean private SellerRegistrationOtpConfigService config;

    @Test
    void publicOtpSettingsExposeOnlyTheTwoRequiredFlags() throws Exception {
        when(config.get()).thenReturn(Map.of(
                "emailOtpEnabled", true,
                "mobileOtpEnabled", false,
                "updatedBy", "internal-admin",
                "updatedAt", "2026-11-06T10:00:00"));

        mockMvc.perform(get("/seller-registration/otp-settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailOtpRequired").value(true))
                .andExpect(jsonPath("$.mobileOtpRequired").value(false))
                .andExpect(jsonPath("$.updatedBy").doesNotExist())
                .andExpect(jsonPath("$.emailOtpEnabled").doesNotExist());
    }

    @Test
    void anonymousAndBuyerCannotReadOrMutateAdminOtpSettings() throws Exception {
        mockMvc.perform(get("/admin/seller-registration/otp-settings"))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(get("/admin/seller-registration/otp-settings/history"))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(put("/admin/seller-registration/otp-settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"emailOtpEnabled\":true,\"mobileOtpEnabled\":false}"))
                .andExpect(status().is4xxClientError());

        when(authService.requireUser("buyer-session")).thenReturn(user("buyer-1", "BUYER"));
        mockMvc.perform(get("/admin/seller-registration/otp-settings")
                .header(HttpHeaders.AUTHORIZATION, "Bearer buyer-session"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/admin/seller-registration/otp-settings")
                .header(HttpHeaders.AUTHORIZATION, "Bearer buyer-session")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"emailOtpEnabled\":true,\"mobileOtpEnabled\":false}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(config);
    }

    @Test
    void adminCanReadHistoryAndUpdatesAreAttributedToAuthenticatedPrincipal() throws Exception {
        when(authService.requireUser("admin-session")).thenReturn(user("admin-1", "ADMIN"));
        when(config.get()).thenReturn(Map.of("emailOtpEnabled", true, "mobileOtpEnabled", false));
        when(config.history(20)).thenReturn(Map.of("items", List.of()));
        when(config.update(true, false, "admin-1")).thenReturn(Map.of("success", true));

        mockMvc.perform(get("/admin/seller-registration/otp-settings")
                .header(HttpHeaders.AUTHORIZATION, "Bearer admin-session"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/admin/seller-registration/otp-settings/history")
                .header(HttpHeaders.AUTHORIZATION, "Bearer admin-session"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/admin/seller-registration/otp-settings")
                .header(HttpHeaders.AUTHORIZATION, "Bearer admin-session")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"emailOtpEnabled\":true,\"mobileOtpEnabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(config).update(true, false, "admin-1");
    }

    private UserEntity user(String id, String role) {
        return UserEntity.builder().userId(id).email(id + "@example.test")
                .name(id).role(role).build();
    }
}

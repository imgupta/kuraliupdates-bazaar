package com.kuraliupdates.bazaar.config;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.controller.HealthController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.util.Map;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = HealthController.class)
@Import({SecurityConfig.class, SessionAuthenticationFilter.class, SecurityConfigTest.ProbeController.class})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @org.springframework.boot.test.mock.mockito.MockBean
    private AuthService authService;

    @org.springframework.boot.test.mock.mockito.MockBean
    private DataSource dataSource;

    @Test
    void permitsOnlyExplicitPublicEntryPointsWithoutBearerToken() throws Exception {
        mockMvc.perform(get("/health/live")).andExpect(status().isOk());
        mockMvc.perform(get("/buyers/products/search")).andExpect(status().isOk());
        mockMvc.perform(get("/daily-help/services")).andExpect(status().isOk());
        mockMvc.perform(get("/daily-help/availability")).andExpect(status().isOk());
        mockMvc.perform(get("/seller-service-area")).andExpect(status().isOk());
        mockMvc.perform(post("/auth/send-otp")).andExpect(status().isOk());
        mockMvc.perform(post("/seller-registration/leads")).andExpect(status().isCreated());
        mockMvc.perform(post("/delivery/register")).andExpect(status().isOk());
        mockMvc.perform(post("/analytics/search")).andExpect(status().isAccepted());
    }

    @Test
    void protectsBuyerSellerDeliveryAndUnknownRoutesByDefault() throws Exception {
        mockMvc.perform(get("/auth/me")).andExpect(status().is4xxClientError());
        mockMvc.perform(get("/buyers/orders")).andExpect(status().is4xxClientError());
        mockMvc.perform(get("/sellers/me")).andExpect(status().is4xxClientError());
        mockMvc.perform(get("/delivery/me")).andExpect(status().is4xxClientError());
        mockMvc.perform(get("/new/unclassified/route")).andExpect(status().is4xxClientError());
    }

    @Test
    void corsAllowsHeadersUsedByNegotiationAndRunScopedE2eRequests() throws Exception {
        mockMvc.perform(options("/negotiations")
                .header(HttpHeaders.ORIGIN, "https://buyer.kuraliupdates.com")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "authorization,x-active-role,x-e2e-run-id,x-e2e-flow-token"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://buyer.kuraliupdates.com"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS,
                        org.hamcrest.Matchers.allOf(
                                org.hamcrest.Matchers.containsString("x-active-role"),
                                org.hamcrest.Matchers.containsString("x-e2e-run-id"))));
    }

    @Test
    void adminRouteRejectsAuthenticatedNonAdminRole() throws Exception {
        when(authService.requireUser("buyer-session"))
                .thenReturn(UserEntity.builder().userId("buyer-1").role("BUYER").build());

        mockMvc.perform(get("/admin/diagnostics")
                .header(HttpHeaders.AUTHORIZATION, "Bearer buyer-session"))
                .andExpect(status().isForbidden());
    }


    @Test
    void e2eSessionRoleOverridesMutablePrimaryAdminRoleForThatSessionOnly() throws Exception {
        when(authService.requireUser("seller-session"))
                .thenReturn(UserEntity.builder().userId("shared-admin-seller").role("ADMIN").build());
        when(authService.requireSessionRole("seller-session")).thenReturn("SELLER");

        mockMvc.perform(get("/admin/diagnostics")
                .header(HttpHeaders.AUTHORIZATION, "Bearer seller-session"))
                .andExpect(status().isForbidden());
    }

    @Test
    void protectedAuthRouteAcceptsAnActiveBearerSession() throws Exception {
        when(authService.requireUser("buyer-session"))
                .thenReturn(UserEntity.builder().userId("buyer-1").role("BUYER").build());

        mockMvc.perform(get("/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer buyer-session"))
                .andExpect(status().isOk())
                .andExpect(content().string("protected"));
    }

    @Test
    void invalidBearerTokenDoesNotGrantAccessToProtectedRoute() throws Exception {
        when(authService.requireUser("expired-session")).thenThrow(new IllegalStateException("expired"));

        mockMvc.perform(get("/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer expired-session"))
                .andExpect(status().is4xxClientError());
    }

    @RestController
    static class ProbeController {
        @GetMapping("/buyers/products/search")
        String publicBuyerSearch() { return "public"; }

        @GetMapping("/daily-help/services")
        String publicDailyHelpServices() { return "public"; }

        @GetMapping("/daily-help/availability")
        String publicDailyHelpAvailability() { return "public"; }

        @GetMapping("/seller-service-area")
        String publicSellerServiceArea() { return "public"; }

        @PostMapping("/auth/send-otp")
        String publicSendOtp() { return "public"; }

        @PostMapping("/seller-registration/leads")
        ResponseEntity<String> publicLead() { return ResponseEntity.status(HttpStatus.CREATED).body("public"); }

        @PostMapping("/delivery/register")
        String publicDeliveryRegistration() { return "public"; }

        @PostMapping("/analytics/search")
        ResponseEntity<Void> publicSearchAnalytics() { return ResponseEntity.accepted().build(); }

        @GetMapping("/auth/me")
        String protectedAuthMe() { return "protected"; }
    }
}

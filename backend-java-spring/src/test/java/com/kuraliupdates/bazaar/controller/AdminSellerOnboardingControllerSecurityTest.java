package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.config.SecurityConfig;
import com.kuraliupdates.bazaar.config.SessionAuthenticationFilter;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.SellerOnboardingLeadService;
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

@WebMvcTest(controllers = AdminSellerOnboardingController.class)
@Import({SecurityConfig.class, SessionAuthenticationFilter.class})
class AdminSellerOnboardingControllerSecurityTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private AuthService authService;
    @MockBean private SellerOnboardingLeadService leads;

    @Test
    void anonymousCannotReadSellerLeadListOrNotes() throws Exception {
        mockMvc.perform(get("/admin/seller-leads"))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(get("/admin/seller-leads/lead-1/notes"))
                .andExpect(status().is4xxClientError());

        verifyNoInteractions(leads);
    }

    @Test
    void authenticatedBuyerCannotReadSellerLeadListOrNotes() throws Exception {
        when(authService.requireUser("buyer-session")).thenReturn(user("buyer-1", "BUYER"));

        mockMvc.perform(get("/admin/seller-leads")
                .header(HttpHeaders.AUTHORIZATION, "Bearer buyer-session"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/admin/seller-leads/lead-1/notes")
                .header(HttpHeaders.AUTHORIZATION, "Bearer buyer-session"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(leads);
    }

    @Test
    void adminCanReadLeadListAndLeadNotes() throws Exception {
        when(authService.requireUser("admin-session")).thenReturn(user("admin-1", "ADMIN"));
        when(leads.list(null, null, 0, 25, false)).thenReturn(
                List.of(Map.of("leadId", "lead-1", "status", "CALLBACK_REQUESTED")));
        when(leads.notes("lead-1")).thenReturn(
                List.of(Map.of("note", "Applicant requested a callback")));

        mockMvc.perform(get("/admin/seller-leads")
                .header(HttpHeaders.AUTHORIZATION, "Bearer admin-session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].leadId").value("lead-1"));

        mockMvc.perform(get("/admin/seller-leads/lead-1/notes")
                .header(HttpHeaders.AUTHORIZATION, "Bearer admin-session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].note").value("Applicant requested a callback"));

        verify(leads).list(null, null, 0, 25);
        verify(leads).notes("lead-1");
    }

    @Test
    void adminMutationsUseAuthenticatedPrincipalRatherThanBodyActor() throws Exception {
        when(authService.requireUser("admin-session")).thenReturn(user("admin-2", "ADMIN"));
        when(leads.update(eq("lead-1"), eq("admin-2"), eq("Case Manager"),
                eq("IN_PROGRESS"), isNull(), eq("Called buyer")))
                .thenReturn(Map.of("success", true));
        when(leads.addNote("lead-1", "admin-2", "Called applicant", "CONTACTED", null))
                .thenReturn(Map.of("success", true));

        mockMvc.perform(patch("/admin/seller-leads/lead-1")
                .header(HttpHeaders.AUTHORIZATION, "Bearer admin-session")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"assignedTo\":\"Case Manager\",\"status\":\"IN_PROGRESS\",\"outcome\":\"Called buyer\",\"actor\":\"spoofed-admin\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(post("/admin/seller-leads/lead-1/notes")
                .header(HttpHeaders.AUTHORIZATION, "Bearer admin-session")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"note\":\"Called applicant\",\"outcome\":\"CONTACTED\",\"actor\":\"spoofed-admin\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(leads).update("lead-1", "admin-2", "Case Manager", "IN_PROGRESS", null, "Called buyer");
        verify(leads).addNote("lead-1", "admin-2", "Called applicant", "CONTACTED", null);
    }

    private UserEntity user(String id, String role) {
        return UserEntity.builder().userId(id).email(id + "@example.test")
                .name(id).role(role).build();
    }
}

package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.SellerOnboardingLeadService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class AdminSellerOnboardingControllerTest {
    private final SellerOnboardingLeadService leads = mock(SellerOnboardingLeadService.class);
    private final AdminSellerOnboardingController controller = new AdminSellerOnboardingController(leads);

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void leadUpdateUsesAuthenticatedAdminUserIdInsteadOfRequestSuppliedActor() {
        authenticateAdmin("admin-user-1");
        when(leads.update(eq("lead-1"), eq("admin-user-1"), eq("Case Manager"),
                eq("IN_PROGRESS"), eq("2026-11-07T10:00:00"), eq("Called buyer")))
                .thenReturn(Map.of("success", true));

        var result = controller.update("lead-1", Map.of(
                "assignedTo", "Case Manager",
                "status", "IN_PROGRESS",
                "followUpAt", "2026-11-07T10:00:00",
                "outcome", "Called buyer",
                "actor", "spoofed-admin"));

        assertEquals(Boolean.TRUE, result.get("success"));
        verify(leads).update("lead-1", "admin-user-1", "Case Manager",
                "IN_PROGRESS", "2026-11-07T10:00:00", "Called buyer");
    }

    @Test
    void leadNoteUsesAuthenticatedAdminUserIdAsAuditAuthor() {
        authenticateAdmin("admin-user-2");
        when(leads.addNote("lead-2", "admin-user-2", "Called applicant", "CONTACTED", null))
                .thenReturn(Map.of("success", true));

        var result = controller.addNote("lead-2", Map.of(
                "note", "Called applicant", "outcome", "CONTACTED", "actor", "spoofed-admin"));

        assertEquals(Boolean.TRUE, result.get("success"));
        verify(leads).addNote("lead-2", "admin-user-2", "Called applicant", "CONTACTED", null);
    }

    @Test
    void leadMutationRejectsMissingAuthenticatedUserPrincipal() {
        SecurityContextHolder.clearContext();

        ApiException error = assertThrows(ApiException.class,
                () -> controller.update("lead-3", Map.of("status", "IN_PROGRESS")));

        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(leads);
    }

    private void authenticateAdmin(String userId) {
        UserEntity admin = UserEntity.builder().userId(userId).email(userId + "@kuraliupdates.test")
                .role("ADMIN").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, "n/a",
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }
}

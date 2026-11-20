package com.kuraliupdates.bazaar.security;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AdminMfaService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminMfaFilterTest {
    @Test
    void deniesAdminMutationWithoutFreshStepUp() throws Exception {
        AdminMfaService service = mock(AdminMfaService.class);
        when(service.isStepUpValid("admin-1", "session-token", null)).thenReturn(false);
        AdminMfaFilter filter = new AdminMfaFilter(service);
        UserEntity admin = UserEntity.builder().userId("admin-1").role("ADMIN").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                admin, "session-token", List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServletPath("/admin/orders");
        request.setMethod("POST");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        try {
            filter.doFilter(request, response, chain);
            assertEquals(403, response.getStatus());
            assertTrue(response.getContentAsString().contains("ADMIN_MFA_REQUIRED"));
            assertNull(chain.getRequest());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void permitsAdminMutationWithStepUpBoundToCurrentSession() throws Exception {
        AdminMfaService service = mock(AdminMfaService.class);
        when(service.isStepUpValid("admin-1", "session-token", "step-up-token")).thenReturn(true);
        AdminMfaFilter filter = new AdminMfaFilter(service);
        UserEntity admin = UserEntity.builder().userId("admin-1").role("ADMIN").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                admin, "session-token", List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServletPath("/admin/orders");
        request.setCookies(new jakarta.servlet.http.Cookie(AdminMfaController.STEP_UP_COOKIE, "step-up-token"));
        MockFilterChain chain = new MockFilterChain();

        try {
            filter.doFilter(request, new MockHttpServletResponse(), chain);
            assertNotNull(chain.getRequest());
            verify(service).isStepUpValid("admin-1", "session-token", "step-up-token");
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void allowsMfaSetupEndpointsBeforeStepUpAndLeavesNonAdminAuthorizationToSecurity() throws Exception {
        AdminMfaService service = mock(AdminMfaService.class);
        AdminMfaFilter filter = new AdminMfaFilter(service);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServletPath("/admin/mfa/status");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertNotNull(chain.getRequest());
        verifyNoInteractions(service);
    }
}

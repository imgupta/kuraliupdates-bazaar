package com.kuraliupdates.bazaar.security;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AdminSecurityAuditService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminSecurityAuditInterceptorTest {
    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void recordsSuccessfulAdminMutationWithoutRequestBody() {
        AdminSecurityAuditService service = mock(AdminSecurityAuditService.class);
        AdminSecurityAuditInterceptor interceptor = new AdminSecurityAuditInterceptor(service);
        UserEntity admin = UserEntity.builder().userId("admin-1").email("admin@example.test").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                admin, "session", List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setContextPath("/api/v1");
        request.setRequestURI("/api/v1/admin/sellers/seller-1/approve");
        request.setMethod("POST");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(200);

        interceptor.afterCompletion(request, response, new Object(), null);

        verify(service).record(eq("admin-1"), eq("admin@example.test"), eq("POST"), eq("SELLER"),
                eq("seller-1"), eq("POST"), eq("/admin/sellers/seller-1/approve"),
                eq("SUCCESS"), eq(200), contains("status=200"));
    }

    @Test
    void doesNotAuditReadOnlyRequestsOrNonAdminActors() {
        AdminSecurityAuditService service = mock(AdminSecurityAuditService.class);
        AdminSecurityAuditInterceptor interceptor = new AdminSecurityAuditInterceptor(service);
        UserEntity buyer = UserEntity.builder().userId("buyer-1").email("buyer@example.test").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                buyer, "session", List.of(new SimpleGrantedAuthority("ROLE_BUYER"))));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/admin/sellers/seller-1/approve");
        request.setMethod("POST");

        interceptor.afterCompletion(request, new MockHttpServletResponse(), new Object(), null);

        verifyNoInteractions(service);
    }
}

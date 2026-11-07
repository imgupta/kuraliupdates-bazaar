package com.kuraliupdates.bazaar.config;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AuthService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SessionAuthenticationFilterTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void establishesAuthorityFromActiveSessionRole() throws Exception {
        AuthService authService = mock(AuthService.class);
        UserEntity user = UserEntity.builder().userId("user-1").role("SELLER").build();
        when(authService.requireUser("valid-session")).thenReturn(user);
        when(authService.requireSessionRole("valid-session")).thenReturn("BUYER");
        SessionAuthenticationFilter filter = new SessionAuthenticationFilter(authService);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer valid-session");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        var authentication = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(authentication);
        assertSame(user, authentication.getPrincipal());
        assertTrue(authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_BUYER".equals(authority.getAuthority())));
        verify(authService).requireUser("valid-session");
        verify(authService).requireSessionRole("valid-session");
    }

    @Test
    void invalidSessionDoesNotCreateAuthenticationAndStillContinuesChain() throws Exception {
        AuthService authService = mock(AuthService.class);
        when(authService.requireUser("expired-session")).thenThrow(new IllegalStateException("expired"));
        SessionAuthenticationFilter filter = new SessionAuthenticationFilter(authService);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer expired-session");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        assertDoesNotThrow(() -> filter.doFilter(request, response, chain));

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertNotNull(chain.getRequest());
        verify(authService).requireUser("expired-session");
    }

    @Test
    void requestWithoutBearerTokenDoesNotCallAuthService() throws Exception {
        AuthService authService = mock(AuthService.class);
        SessionAuthenticationFilter filter = new SessionAuthenticationFilter(authService);

        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verifyNoInteractions(authService);
    }
}

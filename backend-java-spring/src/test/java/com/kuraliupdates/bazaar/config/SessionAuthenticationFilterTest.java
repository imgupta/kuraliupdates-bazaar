package com.kuraliupdates.bazaar.config;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AuthService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockCookie;
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
    void authenticatesFromHttpOnlySessionCookieAndAdaptsLegacyControllerHeaderBoundary() throws Exception {
        AuthService authService = mock(AuthService.class);
        UserEntity user = UserEntity.builder().userId("user-cookie").role("BUYER").build();
        when(authService.requireUser("cookie-session")).thenReturn(user);
        when(authService.requireSessionRole("cookie-session")).thenReturn("BUYER");
        SessionAuthenticationFilter filter = new SessionAuthenticationFilter(authService);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("GET");
        request.setCookies(new MockCookie(SessionAuthenticationFilter.SESSION_COOKIE, "cookie-session"));
        java.util.concurrent.atomic.AtomicReference<jakarta.servlet.http.HttpServletRequest> captured = new java.util.concurrent.atomic.AtomicReference<>();

        filter.doFilter(request, new MockHttpServletResponse(), (wrappedRequest, wrappedResponse) ->
                captured.set((jakarta.servlet.http.HttpServletRequest) wrappedRequest));

        assertNotNull(captured.get());
        assertEquals("Bearer cookie-session", captured.get().getHeader(HttpHeaders.AUTHORIZATION));
        assertEquals(user, SecurityContextHolder.getContext().getAuthentication().getPrincipal());
    }

    @Test
    void rejectsBrowserMutationWithoutMatchingDoubleSubmitCsrfToken() throws Exception {
        AuthService authService = mock(AuthService.class);
        SessionAuthenticationFilter filter = new SessionAuthenticationFilter(authService);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.addHeader(HttpHeaders.ORIGIN, "https://kuraliupdates.com");
        request.setCookies(new MockCookie(SessionAuthenticationFilter.CSRF_COOKIE, "expected"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(403, response.getStatus());
        assertNull(chain.getRequest());
        verifyNoInteractions(authService);
    }

    @Test
    void acceptsBrowserMutationWithAllowlistedOriginAndMatchingCsrfToken() throws Exception {
        AuthService authService = mock(AuthService.class);
        SessionAuthenticationFilter filter = new SessionAuthenticationFilter(authService);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.addHeader(HttpHeaders.ORIGIN, "https://kuraliupdates.com");
        request.addHeader(SessionAuthenticationFilter.CSRF_HEADER, "expected");
        request.setCookies(new MockCookie(SessionAuthenticationFilter.CSRF_COOKIE, "expected"));
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertNotNull(chain.getRequest());
        verifyNoInteractions(authService);
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

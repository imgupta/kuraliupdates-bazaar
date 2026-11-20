package com.kuraliupdates.bazaar.config;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Enumeration;
import java.util.List;
import java.util.Set;

@Component
public class SessionAuthenticationFilter extends OncePerRequestFilter {
    public static final String SESSION_COOKIE = "__Host-ku_session";
    public static final String CSRF_COOKIE = "__Host-ku_csrf";
    public static final String CSRF_HEADER = "X-KU-CSRF";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Set<String> TRUSTED_ORIGINS = Set.of(
            "https://kuraliupdates.com", "https://www.kuraliupdates.com",
            "https://bazaar.kuraliupdates.com", "https://buyer.kuraliupdates.com",
            "https://seller.kuraliupdates.com", "https://delivery.kuraliupdates.com",
            "https://admin.kuraliupdates.com", "https://dailyhelp.kuraliupdates.com",
            "http://localhost:3000", "http://localhost:4200", "http://localhost:5173",
            "http://127.0.0.1:4173", "http://localhost:4173"
    );
    private final AuthService authService;

    public SessionAuthenticationFilter(AuthService authService) {
        this.authService = authService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        issueCsrfCookieIfMissing(request, response);
        if (isUnsafe(request.getMethod()) && !validateCsrf(request, response)) return;

        String cookieToken = cookieValue(request, SESSION_COOKIE);
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        String token = cookieToken != null ? cookieToken
                : (header != null && header.startsWith("Bearer ") ? header.substring(7).trim() : null);

        HttpServletRequest effectiveRequest = request;
        if (cookieToken != null) {
            // Existing controllers consistently resolve Authorization themselves.
            // Present the HttpOnly cookie through that established boundary without
            // exposing its value to browser JavaScript.
            effectiveRequest = new HttpServletRequestWrapper(request) {
                @Override public String getHeader(String name) {
                    return HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name)
                            ? "Bearer " + cookieToken : super.getHeader(name);
                }
                @Override public Enumeration<String> getHeaders(String name) {
                    if (HttpHeaders.AUTHORIZATION.equalsIgnoreCase(name)) {
                        return java.util.Collections.enumeration(List.of("Bearer " + cookieToken));
                    }
                    return super.getHeaders(name);
                }
            };
        }

        if (token != null && !token.isBlank()) {
            try {
                UserEntity user = authService.requireUser(token);
                String sessionRole = authService.requireSessionRole(token);
                String role = (sessionRole == null || sessionRole.isBlank()
                        ? (user.getRole() == null ? "BUYER" : user.getRole()) : sessionRole).trim().toUpperCase();
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        user, token, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (RuntimeException ignored) {
                // Let protected request authorization reject invalid sessions.
            }
        }
        filterChain.doFilter(effectiveRequest, response);
    }

    private void issueCsrfCookieIfMissing(HttpServletRequest request, HttpServletResponse response) {
        if (cookieValue(request, CSRF_COOKIE) != null) return;
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String value = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from(CSRF_COOKIE, value)
                .httpOnly(false).secure(true).sameSite("Lax").path("/")
                .maxAge(java.time.Duration.ofHours(12)).build().toString());
    }

    private boolean validateCsrf(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        String sessionCookie = cookieValue(request, SESSION_COOKIE);
        // Non-browser bearer clients without cookies remain supported for E2E and
        // service integrations. Browser-originated writes must prove same-origin
        // intent with both the allowlisted Origin and a double-submit token.
        if (origin == null && sessionCookie == null) return true;
        if (origin == null || !TRUSTED_ORIGINS.contains(origin)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Untrusted request origin");
            return false;
        }
        String cookie = cookieValue(request, CSRF_COOKIE);
        String supplied = request.getHeader(CSRF_HEADER);
        if (cookie == null || supplied == null
                || !MessageDigest.isEqual(cookie.getBytes(StandardCharsets.UTF_8),
                                          supplied.getBytes(StandardCharsets.UTF_8))) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "CSRF validation failed");
            return false;
        }
        return true;
    }

    private boolean isUnsafe(String method) {
        return !("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method)
                || "OPTIONS".equalsIgnoreCase(method) || "TRACE".equalsIgnoreCase(method));
    }

    private String cookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }
}

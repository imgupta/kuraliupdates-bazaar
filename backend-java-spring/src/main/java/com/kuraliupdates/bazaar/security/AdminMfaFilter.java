package com.kuraliupdates.bazaar.security;

import com.kuraliupdates.bazaar.controller.AdminMfaController;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AdminMfaService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/** Requires a fresh TOTP/recovery-code step-up for every admin API except MFA setup itself. */
public class AdminMfaFilter extends OncePerRequestFilter {
    private static final Set<String> EXEMPT_PATHS = Set.of(
            "/admin/mfa/status", "/admin/mfa/enroll", "/admin/mfa/confirm", "/admin/mfa/verify");

    private final AdminMfaService adminMfaService;

    public AdminMfaFilter(AdminMfaService adminMfaService) {
        this.adminMfaService = adminMfaService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getServletPath();
        if (path == null || path.isBlank()) {
            String uri = request.getRequestURI();
            String context = request.getContextPath();
            path = context != null && !context.isBlank() && uri.startsWith(context) ? uri.substring(context.length()) : uri;
        }
        if (!path.startsWith("/admin/") || EXEMPT_PATHS.contains(path)) {
            chain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()))) {
            chain.doFilter(request, response);
            return;
        }
        if (!(authentication.getPrincipal() instanceof UserEntity admin)
                || !(authentication.getCredentials() instanceof String sessionToken)
                || sessionToken.isBlank()) {
            reject(response);
            return;
        }

        String stepUpToken = cookieValue(request, AdminMfaController.STEP_UP_COOKIE);
        if (!adminMfaService.isStepUpValid(admin.getUserId(), sessionToken, stepUpToken)) {
            reject(response);
            return;
        }
        chain.doFilter(request, response);
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

    private void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.getWriter().write("{\"success\":false,\"code\":\"ADMIN_MFA_REQUIRED\",\"message\":\"Administrator verification is required\"}");
    }
}

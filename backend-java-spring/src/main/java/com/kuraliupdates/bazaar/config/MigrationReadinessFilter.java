package com.kuraliupdates.bazaar.config;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Keeps business and documentation endpoints unavailable until the database
 * migrations have completed. Liveness and readiness endpoints remain reachable
 * so the hosting platform can distinguish a bound process from a usable API.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class MigrationReadinessFilter extends OncePerRequestFilter {
    private final DatabaseMigrationState migrationState;

    public MigrationReadinessFilter(DatabaseMigrationState migrationState) {
        this.migrationState = migrationState;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return "/health/live".equals(path)
                || "/health".equals(path)
                || "/health/ready".equals(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (migrationState.isReady()) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        response.setHeader("Retry-After", "5");
        response.setHeader("Cache-Control", "no-store");
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":\"NOT_READY\",\"reason\":\"DATABASE_MIGRATION_"
                + migrationState.getStatus().name() + "\"}");
    }
}

package com.kuraliupdates.bazaar.security;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AdminSecurityAuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;

/** Audits every successful or failed admin mutation without recording request bodies or secrets. */
@Component
public class AdminSecurityAuditInterceptor implements HandlerInterceptor {
    private static final Logger log = LoggerFactory.getLogger(AdminSecurityAuditInterceptor.class);
    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final Set<String> NON_ID_SEGMENTS = Set.of(
            "pending", "configuration", "analytics", "diagnostics", "services", "helpers",
            "buyers", "sellers", "delivery", "accounts", "security", "audit", "location");

    private final AdminSecurityAuditService auditService;

    public AdminSecurityAuditInterceptor(AdminSecurityAuditService auditService) {
        this.auditService = auditService;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception exception) {
        if (!MUTATING_METHODS.contains(request.getMethod().toUpperCase())
                || !requestPath(request).startsWith("/admin/")) return;

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getAuthorities().stream().noneMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()))) {
            return;
        }

        String actorId = null;
        String actorEmail = null;
        if (authentication.getPrincipal() instanceof UserEntity actor) {
            actorId = actor.getUserId();
            actorEmail = actor.getEmail();
        }

        String path = requestPath(request);
        String[] segments = path.substring("/admin/".length()).split("/");
        String targetType = segments.length == 0 ? "ADMIN" : segments[0].replace('-', '_').toUpperCase();
        String targetId = segments.length > 1 && !NON_ID_SEGMENTS.contains(segments[1].toLowerCase())
                ? limit(segments[1], 128) : null;
        if ("delivery".equalsIgnoreCase(targetType)) targetType = "DELIVERY_PARTNER";
        if ("daily_help".equalsIgnoreCase(targetType)) targetType = "DAILY_HELP";
        if ("seller_documents".equalsIgnoreCase(targetType)) targetType = "SELLER_DOCUMENT";

        String action = handler instanceof HandlerMethod method
                ? method.getMethod().getName() : request.getMethod();
        int status = response.getStatus();
        boolean success = exception == null && status < 400;
        String outcome = success ? "SUCCESS" : "FAILURE";
        String details = "handler=" + limit(action, 180) + ";status=" + status
                + (exception == null ? "" : ";exception=" + exception.getClass().getSimpleName());

        try {
            auditService.record(actorId, actorEmail, limit(action, 120), limit(targetType, 80),
                    targetId, request.getMethod(), limit(path, 500), outcome, status, limit(details, 1000));
        } catch (RuntimeException auditFailure) {
            // Do not turn an already-completed business transaction into a misleading client error.
            // The failure is emitted as a high-severity application log for operations alerting.
            log.error("ADMIN_SECURITY_AUDIT_WRITE_FAILED actorId={} action={} path={} status={}",
                    actorId, action, path, status, auditFailure);
        }

        if (!success) {
            log.warn("ADMIN_SECURITY_EVENT outcome=FAILURE actorId={} action={} path={} status={} exceptionType={}",
                    actorId, action, path, status, exception == null ? "none" : exception.getClass().getSimpleName());
        }
    }

    private String requestPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        return context != null && !context.isEmpty() && uri.startsWith(context)
                ? uri.substring(context.length()) : uri;
    }

    private String limit(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}

package com.kuraliupdates.bazaar.security;

import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.ApiRateLimitService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Optional;
import java.util.regex.Pattern;

/** Independent device/IP abuse controls for public OTP endpoints. */
@Component
public class OtpAbuseProtectionFilter extends OncePerRequestFilter {
    public static final String DEVICE_HEADER = "X-KU-Device-ID";
    private static final Pattern DEVICE_ID = Pattern.compile("[A-Fa-f0-9-]{36}");

    private final ApiRateLimitService rateLimit;
    private final TrustedClientIpResolver clientIpResolver;

    public OtpAbuseProtectionFilter(ApiRateLimitService rateLimit, TrustedClientIpResolver clientIpResolver) {
        this.rateLimit = rateLimit;
        this.clientIpResolver = clientIpResolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();
        String operation = path.endsWith("/auth/send-otp") && "POST".equalsIgnoreCase(method) ? "send"
                : path.endsWith("/auth/verify-otp") && "POST".equalsIgnoreCase(method) ? "verify" : null;
        if (operation == null) {
            chain.doFilter(request, response);
            return;
        }

        try {
            String deviceId = request.getHeader(DEVICE_HEADER);
            if (deviceId != null && !deviceId.isBlank()) {
                if (!DEVICE_ID.matcher(deviceId).matches()) {
                    reject(response, HttpStatus.BAD_REQUEST, "Invalid device identifier");
                    return;
                }
                int deviceLimit = "send".equals(operation) ? 10 : 30;
                rateLimit.requireAllowed("otp-device-" + operation, deviceId.toLowerCase(),
                        deviceLimit, Duration.ofHours(1));
            }

            Optional<String> clientIp = clientIpResolver.resolve(request);
            if (clientIp.isPresent()) {
                int ipLimit = "send".equals(operation) ? 20 : 60;
                rateLimit.requireAllowed("otp-client-ip-" + operation, clientIp.get(),
                        ipLimit, Duration.ofHours(1));
            }
        } catch (ApiException limited) {
            reject(response, limited.getStatus(), limited.getMessage());
            return;
        }

        chain.doFilter(request, response);
    }

    private void reject(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        String safeMessage = message == null ? "Request limit exceeded" : message.replace("\\", "\\\\").replace("\"", "\\\"");
        response.getWriter().write("{\"success\":false,\"message\":\"" + safeMessage + "\"}");
    }
}

package com.kuraliupdates.bazaar.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final SessionAuthenticationFilter sessionAuthenticationFilter;

    public SecurityConfig(SessionAuthenticationFilter sessionAuthenticationFilter) {
        this.sessionAuthenticationFilter = sessionAuthenticationFilter;
    }

    /**
     * This filter is also part of the Spring Security chain below. Disable the
     * servlet-container auto-registration of the @Component bean; otherwise it
     * can run before SecurityContextHolderFilter, mark itself as already
     * filtered, and then be skipped inside the security chain. That leaves
     * protected requests anonymous (and produces misleading 403 responses).
     */
    @Bean
    public FilterRegistrationBean<SessionAuthenticationFilter> sessionAuthenticationFilterRegistration() {
        FilterRegistrationBean<SessionAuthenticationFilter> registration =
                new FilterRegistrationBean<>(sessionAuthenticationFilter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // The current web client authenticates with explicit Bearer headers.
            // Do not enable cookie-based CSRF semantics until the coordinated
            // HttpOnly-cookie migration and CSRF token contract are deployed.
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(contentType -> {})
                .cacheControl(cache -> {})
                // HSTS is emitted only on HTTPS requests by Spring Security.
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31_536_000)
                )
                .referrerPolicy(referrer -> referrer.policy(
                    org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
                ))
                // Begin CSP in report-only mode. This intentionally does not block
                // production assets until the Vite, map, image and payment-provider
                // inventories have been verified against real browser reports.
                .addHeaderWriter(new StaticHeadersWriter(
                    "Content-Security-Policy-Report-Only",
                    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
                    "form-action 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                    "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; " +
                    "font-src 'self' data: https:; connect-src 'self' https: wss:; " +
                    "upgrade-insecure-requests"
                ))
                .addHeaderWriter(new StaticHeadersWriter(
                    "Permissions-Policy",
                    "camera=(), microphone=(), geolocation=(self), payment=(self)"
                ))
            )
            .addFilterBefore(sessionAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                // Public health and API documentation endpoints.
                .requestMatchers(HttpMethod.GET,
                    "/health",
                    "/health/live",
                    "/health/ready",
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html"
                ).permitAll()

                // Public sign-in, registration verification and one-time portal handoff redemption.
                .requestMatchers(HttpMethod.GET, "/privacy/notice-metadata").permitAll()

                .requestMatchers(HttpMethod.POST,
                    "/auth/send-otp",
                    "/auth/registration-check",
                    "/auth/verify-otp",
                    "/auth/portal-handoff/redeem"
                ).permitAll()

                // Public catalogue and Daily Help discovery only; all buyer data/actions require a session.
                .requestMatchers(HttpMethod.GET,
                    "/buyers/products/search",
                    "/daily-help/services",
                    "/daily-help/availability",
                    "/seller-registration/otp-settings",
                    "/registration/otp-settings",
                    "/seller-service-area"
                ).permitAll()

                // Assisted seller lead capture and verification are intentionally public onboarding entry points.
                .requestMatchers(HttpMethod.POST,
                    "/seller-registration/leads",
                    "/seller-registration/leads/*/send-contact-otps",
                    "/seller-registration/leads/*/verify-contact",
                    "/seller-registration/leads/*/callback",
                    "/sellers/register",
                    "/analytics/search"
                ).permitAll()

                // These staging-only controllers independently enforce strong, constant-time shared-token checks.
                .requestMatchers("/e2e/**").permitAll()

                .requestMatchers("/admin/**").hasRole("ADMIN")

                // Seller application continuation uses an unguessable, hashed, time-limited application token.
                .requestMatchers(HttpMethod.GET, "/seller-applications/*", "/seller-applications/*/documents").permitAll()
                .requestMatchers(HttpMethod.PUT, "/seller-applications/*").permitAll()
                .requestMatchers(HttpMethod.POST, "/seller-applications/*/documents", "/seller-applications/*/submit").permitAll()

                .anyRequest().authenticated()
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Credentialed CORS must never accept arbitrary origins. Keep this list
        // aligned with the first-party role frontends and local development.
        config.setAllowedOrigins(List.of(
            "https://kuraliupdates.com",
            "https://www.kuraliupdates.com",
            "https://bazaar.kuraliupdates.com",
            "https://buyer.kuraliupdates.com",
            "https://seller.kuraliupdates.com",
            "https://delivery.kuraliupdates.com",
            "https://admin.kuraliupdates.com",
            "https://dailyhelp.kuraliupdates.com",
            "http://localhost:4200",
            "http://localhost:5173",
            "http://localhost:3000"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With",
            "X-Active-Role",
            "X-Seller-Application-Token",
            "X-E2E-Run-Id",
            "X-E2E-Flow-Token",
            "X-E2E-OTP-Token"
        ));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}

package com.kuraliupdates.bazaar.config;

import com.kuraliupdates.bazaar.security.AdminMfaFilter;
import com.kuraliupdates.bazaar.security.OtpAbuseProtectionFilter;
import com.kuraliupdates.bazaar.security.TrustedClientIpResolver;
import com.kuraliupdates.bazaar.service.AdminMfaService;
import com.kuraliupdates.bazaar.service.ApiRateLimitService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SecurityFilterBeans {
    @Bean
    @ConditionalOnBean(ApiRateLimitService.class)
    public OtpAbuseProtectionFilter otpAbuseProtectionFilter(
            ApiRateLimitService rateLimit, TrustedClientIpResolver clientIpResolver) {
        return new OtpAbuseProtectionFilter(rateLimit, clientIpResolver);
    }

    @Bean
    @ConditionalOnBean(AdminMfaService.class)
    public AdminMfaFilter adminMfaFilter(AdminMfaService adminMfaService) {
        return new AdminMfaFilter(adminMfaService);
    }

    @Bean
    @ConditionalOnBean(OtpAbuseProtectionFilter.class)
    public FilterRegistrationBean<OtpAbuseProtectionFilter> otpAbuseProtectionFilterRegistration(OtpAbuseProtectionFilter filter) {
        FilterRegistrationBean<OtpAbuseProtectionFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    @ConditionalOnBean(AdminMfaFilter.class)
    public FilterRegistrationBean<AdminMfaFilter> adminMfaFilterRegistration(AdminMfaFilter filter) {
        FilterRegistrationBean<AdminMfaFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}

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
    public FilterRegistrationBean<OtpAbuseProtectionFilter> otpAbuseProtectionFilterRegistration(
            org.springframework.beans.factory.ObjectProvider<OtpAbuseProtectionFilter> provider) {
        FilterRegistrationBean<OtpAbuseProtectionFilter> registration = new FilterRegistrationBean<>();
        provider.ifAvailable(registration::setFilter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public FilterRegistrationBean<AdminMfaFilter> adminMfaFilterRegistration(
            org.springframework.beans.factory.ObjectProvider<AdminMfaFilter> provider) {
        FilterRegistrationBean<AdminMfaFilter> registration = new FilterRegistrationBean<>();
        provider.ifAvailable(registration::setFilter);
        registration.setEnabled(false);
        return registration;
    }
}

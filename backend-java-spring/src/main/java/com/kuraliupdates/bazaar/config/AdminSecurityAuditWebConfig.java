package com.kuraliupdates.bazaar.config;

import com.kuraliupdates.bazaar.security.AdminSecurityAuditInterceptor;
import com.kuraliupdates.bazaar.service.AdminSecurityAuditService;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AdminSecurityAuditWebConfig implements WebMvcConfigurer {
    private final ObjectProvider<AdminSecurityAuditService> auditServiceProvider;

    public AdminSecurityAuditWebConfig(ObjectProvider<AdminSecurityAuditService> auditServiceProvider) {
        this.auditServiceProvider = auditServiceProvider;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        auditServiceProvider.ifAvailable(service -> registry.addInterceptor(
                new AdminSecurityAuditInterceptor(service)).addPathPatterns("/admin/**"));
    }
}

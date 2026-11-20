package com.kuraliupdates.bazaar.config;

import com.kuraliupdates.bazaar.security.AdminSecurityAuditInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class AdminSecurityAuditWebConfig implements WebMvcConfigurer {
    private final AdminSecurityAuditInterceptor adminSecurityAuditInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(adminSecurityAuditInterceptor).addPathPatterns("/admin/**");
    }
}

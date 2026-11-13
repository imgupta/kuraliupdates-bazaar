package com.kuraliupdates.bazaar.config;

import java.util.List;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

/**
 * Validates runtime credentials before application beans initialize.
 *
 * JDBC URL transport validation is intentionally left to the configured
 * datasource: Spring test slices replace the datasource URL after environment
 * post-processors run, so validating ORACLE_JDBC_URL here breaks H2 tests.
 */
public final class OracleSecretsEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {
    private static final List<String> REQUIRED_CREDENTIALS = List.of(
            "ORACLE_JDBC_URL", "ORACLE_USERNAME", "ORACLE_PASSWORD", "JWT_SECRET");

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        validate(environment);
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }

    static void validate(ConfigurableEnvironment environment) {
        for (String key : REQUIRED_CREDENTIALS) {
            String value = environment.getProperty(key);
            if (value == null || value.isBlank()) {
                throw new IllegalStateException("Missing required environment variable: " + key);
            }
        }

        String jwtSecret = environment.getProperty("JWT_SECRET");
        if (jwtSecret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 characters");
        }
    }
}

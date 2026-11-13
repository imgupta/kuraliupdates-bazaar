package com.kuraliupdates.bazaar.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class OracleSecretsEnvironmentPostProcessorTest {

    @Test
    void acceptsWalletlessTcpsConnectionWithoutWalletConfiguration() {
        assertDoesNotThrow(() -> OracleSecretsEnvironmentPostProcessor.validate(
                testEnvironment(completeProperties())));
    }

    @Test
    void rejectsMissingRequiredCredentialsWithoutEchoingValues() {
        for (String key : java.util.List.of("ORACLE_JDBC_URL", "ORACLE_USERNAME", "ORACLE_PASSWORD", "JWT_SECRET")) {
            Map<String, Object> properties = completeProperties();
            properties.remove(key);
            IllegalStateException error = assertThrows(IllegalStateException.class,
                    () -> OracleSecretsEnvironmentPostProcessor.validate(testEnvironment(properties)));
            org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains(key));
            org.junit.jupiter.api.Assertions.assertFalse(error.getMessage().contains("unit-test-"));
        }
    }

    @Test
    void rejectsWeakJwtSecret() {
        Map<String, Object> properties = completeProperties();
        properties.put("JWT_SECRET", "short");
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> OracleSecretsEnvironmentPostProcessor.validate(testEnvironment(properties)));
        org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("JWT_SECRET"));
        org.junit.jupiter.api.Assertions.assertFalse(error.getMessage().contains("short"));
    }

    private Map<String, Object> completeProperties() {
        Map<String, Object> properties = new HashMap<>();
        properties.put("ORACLE_JDBC_URL",
                "jdbc:oracle:thin:@(description=(address=(protocol=tcps)(host=db.example.com)(port=1522))(connect_data=(service_name=app_high.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))");
        properties.put("ORACLE_USERNAME", "unit-test-user");
        properties.put("ORACLE_PASSWORD", "unit-test-database-password");
        properties.put("JWT_SECRET", "unit-test-jwt-secret-with-at-least-32-chars");
        return properties;
    }

    private MockEnvironment testEnvironment(Map<String, Object> properties) {
        MockEnvironment environment = new MockEnvironment();
        environment.getPropertySources().remove("systemEnvironment");
        environment.getPropertySources().remove("systemProperties");
        environment.getPropertySources().addFirst(
                new org.springframework.core.env.MapPropertySource("test", properties));
        return environment;
    }
}

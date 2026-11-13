package com.kuraliupdates.bazaar.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.security.KeyStore;
import javax.net.ssl.SSLContext;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;

class OracleSecretsEnvironmentPostProcessorTest {
    private static final List<String> WALLET_FILES = List.of(
            "tnsnames.ora", "sqlnet.ora", "cwallet.sso", "ewallet.p12", "truststore.jks", "keystore.jks");

    @TempDir
    Path tempDirectory;

    private MockEnvironment environment;

    @BeforeEach
    void setUp() throws Exception {
        environment = testEnvironment(completeProperties());
        createWalletFiles();
    }

    @Test
    void leavesDefaultPkcs12AndJsseProvidersUnchangedForSsoWallet() throws Exception {
        String originalPkcs12Provider = KeyStore.getInstance("PKCS12").getProvider().getName();
        assertDoesNotThrow(() -> new OracleSecretsEnvironmentPostProcessor()
                .postProcessEnvironment(environment, new org.springframework.boot.SpringApplication()));
        org.junit.jupiter.api.Assertions.assertEquals(
                originalPkcs12Provider, KeyStore.getInstance("PKCS12").getProvider().getName());
        assertDoesNotThrow(SSLContext::getDefault);
    }

    @Test
    void acceptsCompleteConfigurationAndReadableWallet() {
        assertDoesNotThrow(() -> OracleSecretsEnvironmentPostProcessor.validate(environment));
    }

    @Test
    void rejectsMissingRequiredCredentialsWithoutEchoingValues() {
        for (String key : List.of("ORACLE_JDBC_URL", "ORACLE_USERNAME", "ORACLE_PASSWORD", "JWT_SECRET")) {
            Map<String, Object> properties = completeProperties();
            properties.remove(key);
            MockEnvironment missing = testEnvironment(properties);
            IllegalStateException error = assertThrows(IllegalStateException.class,
                    () -> OracleSecretsEnvironmentPostProcessor.validate(missing));
            org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains(key));
            org.junit.jupiter.api.Assertions.assertFalse(error.getMessage().contains("unit-test-"));
        }
    }

    @Test
    void rejectsMissingWalletDirectory() {
        Map<String, Object> properties = completeProperties();
        properties.put("ORACLE_WALLET_DIR", tempDirectory.resolve("missing").toString());
        MockEnvironment missingDirectory = testEnvironment(properties);
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> OracleSecretsEnvironmentPostProcessor.validate(missingDirectory));
        org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("ORACLE_WALLET_DIR"));
        assertFalse(error.getMessage().contains("unit-test-"));
    }

    @Test
    void rejectsMissingWalletDirectoryConfiguration() {
        MockEnvironment missing = testEnvironment(completePropertiesWithoutWalletDirectory());
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> OracleSecretsEnvironmentPostProcessor.validate(missing));
        org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("ORACLE_WALLET_DIR"));
        assertFalse(error.getMessage().contains("unit-test-"));
    }

    @Test
    void rejectsSymlinkedWalletDirectory() throws Exception {
        Path link = tempDirectory.resolve("wallet-link");
        Files.createSymbolicLink(link, tempDirectory);
        Map<String, Object> properties = completeProperties();
        properties.put("ORACLE_WALLET_DIR", link.toString());
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> OracleSecretsEnvironmentPostProcessor.validate(testEnvironment(properties)));
        org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("ORACLE_WALLET_DIR"));
        assertFalse(error.getMessage().contains("unit-test-"));
    }

    @Test
    void rejectsEachMissingMandatoryWalletFile() throws Exception {
        for (String walletFile : WALLET_FILES) {
            Path path = tempDirectory.resolve(walletFile);
            Files.delete(path);
            IllegalStateException error = assertThrows(IllegalStateException.class,
                    () -> OracleSecretsEnvironmentPostProcessor.validate(environment));
            org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains(walletFile));
            org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("not present at configured wallet directory"));
            createWalletFile(walletFile);
        }
    }

    @Test
    void acceptsSymlinkedWalletFileWhenTargetStaysInsideWalletDirectory() throws Exception {
        Path target = tempDirectory.resolve("wallet-target");
        Files.write(target, new byte[] { 1 });
        Path tnsNames = tempDirectory.resolve("tnsnames.ora");
        Files.delete(tnsNames);
        Files.createSymbolicLink(tnsNames, target);
        assertDoesNotThrow(() -> OracleSecretsEnvironmentPostProcessor.validate(environment));
    }

    @Test
    void rejectsSymlinkedWalletFileWhenTargetEscapesWalletDirectory() throws Exception {
        Path target = tempDirectory.resolveSibling("wallet-target-outside");
        Files.write(target, new byte[] { 1 });
        try {
            Path tnsNames = tempDirectory.resolve("tnsnames.ora");
            Files.delete(tnsNames);
            Files.createSymbolicLink(tnsNames, target);
            IllegalStateException error = assertThrows(IllegalStateException.class,
                    () -> OracleSecretsEnvironmentPostProcessor.validate(environment));
            org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("tnsnames.ora"));
            org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains(
                    "symbolic link target is outside configured wallet directory"));
            assertFalse(error.getMessage().contains("unit-test-"));
        } finally {
            Files.deleteIfExists(target);
        }
    }

    @Test
    void rejectsUnreadableWalletFilesWithoutExposingContents() throws Exception {
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> OracleSecretsEnvironmentPostProcessor.validate(environment, walletFile -> {
                    if (walletFile.getFileName().toString().equals("truststore.jks")) {
                        throw new java.io.IOException("simulated read failure");
                    }
                }));
        org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("truststore.jks"));
        org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("could not be opened (IOException)"));
        assertFalse(error.getMessage().contains("simulated read failure"));
        assertFalse(error.getMessage().contains("unit-test-"));
    }


    @Test
    void rejectsWeakJwtSecret() {
        Map<String, Object> properties = completeProperties();
        properties.put("JWT_SECRET", "short");
        MockEnvironment weak = testEnvironment(properties);
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> OracleSecretsEnvironmentPostProcessor.validate(weak));
        org.junit.jupiter.api.Assertions.assertTrue(error.getMessage().contains("JWT_SECRET"));
        assertFalse(error.getMessage().contains("short"));
    }

    private Map<String, Object> completeProperties() {
        Map<String, Object> properties = new HashMap<>();
        properties.put("ORACLE_JDBC_URL", "jdbc:oracle:thin:@unit-test");
        properties.put("ORACLE_USERNAME", "unit-test-user");
        properties.put("ORACLE_PASSWORD", "unit-test-database-password");
        properties.put("JWT_SECRET", "unit-test-jwt-secret-with-at-least-32-chars");
        properties.put("ORACLE_WALLET_DIR", tempDirectory.toString());
        return properties;
    }

    private Map<String, Object> completePropertiesWithoutWalletDirectory() {
        Map<String, Object> properties = completeProperties();
        properties.remove("ORACLE_WALLET_DIR");
        return properties;
    }

    private MockEnvironment testEnvironment(Map<String, Object> properties) {
        MockEnvironment testEnvironment = new MockEnvironment();
        testEnvironment.getPropertySources().remove("systemEnvironment");
        testEnvironment.getPropertySources().remove("systemProperties");
        testEnvironment.getPropertySources().addFirst(new org.springframework.core.env.MapPropertySource("test", properties));
        return testEnvironment;
    }

    private void createWalletFiles() throws Exception {
        for (String walletFile : WALLET_FILES) {
            createWalletFile(walletFile);
        }
    }

    private void createWalletFile(String name) throws Exception {
        Files.write(tempDirectory.resolve(name), new byte[] { 1 });
    }
}

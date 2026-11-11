package com.kuraliupdates.bazaar.config;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.List;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

/**
 * Validates required runtime credentials and the Oracle wallet before any
 * Spring beans (including Flyway and the datasource) can initialize.
 */
public final class OracleSecretsEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {
    private static final List<String> REQUIRED_CREDENTIALS = List.of(
            "ORACLE_JDBC_URL",
            "ORACLE_USERNAME",
            "ORACLE_PASSWORD",
            "WALLET_PASSWORD",
            "JWT_SECRET");

    private static final List<String> REQUIRED_WALLET_FILES = List.of(
            "tnsnames.ora",
            "sqlnet.ora",
            "cwallet.sso",
            "ewallet.p12",
            "truststore.jks",
            "keystore.jks");

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        validate(environment);
    }

    @Override
    public int getOrder() {
        // Run after ConfigDataEnvironmentPostProcessor so environment sources
        // are loaded, but still before application context refresh/bean creation.
        return Ordered.LOWEST_PRECEDENCE;
    }

    static void validate(ConfigurableEnvironment environment) {
        validate(environment, OracleSecretsEnvironmentPostProcessor::ensureReadableWalletFile);
    }

    static void validate(ConfigurableEnvironment environment, WalletFileValidator walletFileValidator) {
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

        String walletDirectory = environment.getProperty("ORACLE_WALLET_DIR");
        if (walletDirectory == null || walletDirectory.isBlank()) {
            throw new IllegalStateException("Missing required environment variable: ORACLE_WALLET_DIR");
        }

        Path directory;
        try {
            directory = Path.of(walletDirectory);
        } catch (RuntimeException ex) {
            throw new IllegalStateException("ORACLE_WALLET_DIR is not a valid filesystem path");
        }
        if (!Files.isDirectory(directory) || !Files.isReadable(directory)) {
            throw new IllegalStateException("ORACLE_WALLET_DIR must identify a readable wallet directory");
        }

        for (String fileName : REQUIRED_WALLET_FILES) {
            Path walletFile = directory.resolve(fileName);
            try {
                walletFileValidator.validate(walletFile);
            } catch (IOException | SecurityException ex) {
                throw new IllegalStateException("Required Oracle wallet file is unreadable: " + fileName);
            }
        }
    }

    private static void ensureReadableWalletFile(Path walletFile) throws IOException {
        if (!Files.isRegularFile(walletFile, LinkOption.NOFOLLOW_LINKS)) {
            throw new IOException("not a regular file");
        }
        try (InputStream input = Files.newInputStream(walletFile)) {
            if (input.read() < 0) {
                throw new IOException("empty file");
            }
        }
    }

    @FunctionalInterface
    interface WalletFileValidator {
        void validate(Path walletFile) throws IOException;
    }
}

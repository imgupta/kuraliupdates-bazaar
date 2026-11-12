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
        boolean directoryIsSafe;
        try {
            directoryIsSafe = directory.isAbsolute() && directory.normalize().equals(directory)
                    && !containsSymbolicLink(directory)
                    && Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS)
                    && Files.isReadable(directory);
        } catch (SecurityException ex) {
            directoryIsSafe = false;
        }
        if (!directoryIsSafe) {
            throw new IllegalStateException(
                    "ORACLE_WALLET_DIR must be an absolute, normalized, non-symlink readable directory");
        }

        for (String fileName : REQUIRED_WALLET_FILES) {
            Path walletFile = directory.resolve(fileName);
            try {
                walletFileValidator.validate(walletFile);
            } catch (IOException | SecurityException ex) {
                throw new IllegalStateException("Oracle wallet file validation failed: "
                        + fileName + " (" + describeFileFailure(walletFile, ex) + ")");
            }
        }
    }

    /**
     * Safe diagnostic only: never exposes file contents, environment values, or exception messages.
     */
    private static String describeFileFailure(Path walletFile, Exception failure) {
        try {
            if (!Files.exists(walletFile, LinkOption.NOFOLLOW_LINKS)) return "not present at configured wallet directory";
            if (Files.isSymbolicLink(walletFile)) return "symbolic links are not permitted";
            if (!Files.isRegularFile(walletFile, LinkOption.NOFOLLOW_LINKS)) return "not a regular file";
            if (!Files.isReadable(walletFile)) return "not readable by the application process";
            if (Files.size(walletFile) == 0L) return "file is empty";
            return "could not be opened (" + failure.getClass().getSimpleName() + ")";
        } catch (IOException | SecurityException diagnosticFailure) {
            return "file metadata could not be read (" + diagnosticFailure.getClass().getSimpleName() + ")";
        }
    }

    private static void ensureReadableWalletFile(Path walletFile) throws IOException {
        if (!Files.isRegularFile(walletFile, LinkOption.NOFOLLOW_LINKS)) {
            throw new IOException("not a regular file");
        }
        try (InputStream input = Files.newInputStream(walletFile, LinkOption.NOFOLLOW_LINKS)) {
            if (input.read() < 0) {
                throw new IOException("empty file");
            }
        }
    }

    private static boolean containsSymbolicLink(Path directory) {
        Path current = directory.getRoot();
        if (current == null) {
            return false;
        }
        for (Path component : directory) {
            current = current.resolve(component);
            if (Files.isSymbolicLink(current)) {
                return true;
            }
        }
        return false;
    }

    @FunctionalInterface
    interface WalletFileValidator {
        void validate(Path walletFile) throws IOException;
    }
}

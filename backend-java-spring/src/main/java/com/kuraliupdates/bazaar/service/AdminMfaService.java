package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.AdminMfaFactorEntity;
import com.kuraliupdates.bazaar.entity.AdminMfaRecoveryCodeEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.AdminMfaFactorRepository;
import com.kuraliupdates.bazaar.repository.AdminMfaRecoveryCodeRepository;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class AdminMfaService {
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int RECOVERY_CODE_COUNT = 10;
    private static final int STEP_UP_MINUTES = 10;

    private final AdminMfaFactorRepository factors;
    private final AdminMfaRecoveryCodeRepository recoveryCodes;
    private final SecretKeySpec encryptionKey;

    public AdminMfaService(AdminMfaFactorRepository factors,
                           AdminMfaRecoveryCodeRepository recoveryCodes,
                           Environment environment) {
        String rootSecret = environment.getRequiredProperty("app.jwt.secret");
        if (rootSecret == null || rootSecret.length() < 32) {
            throw new IllegalStateException("app.jwt.secret must contain at least 32 characters for admin MFA key derivation");
        }
        this.factors = factors;
        this.recoveryCodes = recoveryCodes;
        this.encryptionKey = new SecretKeySpec(deriveEncryptionKey(rootSecret), "AES");
    }

    @Transactional(readOnly = true)
    public Status status(String userId, String sessionToken, String stepUpToken) {
        Optional<AdminMfaFactorEntity> factor = factors.findById(userId);
        if (factor.isEmpty() || !Integer.valueOf(1).equals(factor.get().getEnabled())) {
            return new Status(false, false);
        }
        return new Status(true, isStepUpValid(factor.get(), sessionToken, stepUpToken));
    }

    @Transactional
    public Enrollment beginEnrollment(String userId, String email) {
        AdminMfaFactorEntity factor = factors.findById(userId).orElseGet(() -> AdminMfaFactorEntity.builder()
                .userId(userId).enabled(0).createdAt(LocalDateTime.now()).build());
        if (Integer.valueOf(1).equals(factor.getEnabled())) {
            throw new ApiException(HttpStatus.CONFLICT, "Admin MFA is already enabled");
        }
        String secret = base32Encode(randomBytes(20));
        factor.setEncryptedSecret(encrypt(secret));
        factor.setEnabled(0);
        factor.setStepUpTokenHash(null);
        factor.setStepUpSessionHash(null);
        factor.setStepUpExpiresAt(null);
        factor.setUpdatedAt(LocalDateTime.now());
        factors.save(factor);
        String label = "KuraliUpdates:" + (email == null || email.isBlank() ? userId : email.trim());
        String uri = "otpauth://totp/" + urlEncode(label) + "?secret=" + secret
                + "&issuer=KuraliUpdates&algorithm=SHA1&digits=6&period=30";
        return new Enrollment(secret, uri);
    }

    @Transactional
    public Confirmation confirmEnrollment(String userId, String sessionToken, String code) {
        AdminMfaFactorEntity factor = factors.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "Start admin MFA enrollment first"));
        if (Integer.valueOf(1).equals(factor.getEnabled())) {
            throw new ApiException(HttpStatus.CONFLICT, "Admin MFA is already enabled");
        }
        String secret = decrypt(factor.getEncryptedSecret());
        Long matchedCounter = matchingTotpCounter(secret, code, Instant.now());
        if (matchedCounter == null || factors.consumeTotpCounter(userId, matchedCounter) != 1) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "The authenticator code is invalid, expired or already used");
        }
        factor.setLastTotpCounter(matchedCounter);

        factor.setEnabled(1);
        factor.setUpdatedAt(LocalDateTime.now());
        recoveryCodes.deleteAllForUser(userId);
        List<String> plainCodes = new ArrayList<>();
        for (int i = 0; i < RECOVERY_CODE_COUNT; i++) {
            String plain = formatRecoveryCode(base32Encode(randomBytes(12)));
            plainCodes.add(plain);
            recoveryCodes.save(AdminMfaRecoveryCodeEntity.builder()
                    .codeHash(hash(normalizeRecoveryCode(plain)))
                    .userId(userId)
                    .createdAt(LocalDateTime.now())
                    .build());
        }
        String stepUpToken = issueStepUp(factor, sessionToken);
        return new Confirmation(plainCodes, stepUpToken);
    }

    @Transactional
    public String verifyStepUp(String userId, String sessionToken, String code) {
        AdminMfaFactorEntity factor = factors.findById(userId)
                .filter(value -> Integer.valueOf(1).equals(value.getEnabled()))
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Admin MFA enrollment is required"));
        String secret = decrypt(factor.getEncryptedSecret());
        Long matchedCounter = matchingTotpCounter(secret, code, Instant.now());
        boolean validTotp = matchedCounter != null
                && factors.consumeTotpCounter(userId, matchedCounter) == 1;
        if (validTotp) {
            factor.setLastTotpCounter(matchedCounter);
            factors.save(factor);
        } else {
            String normalized = normalizeRecoveryCode(code);
            if (normalized.length() != 20
                    || recoveryCodes.consume(userId, hash(normalized), LocalDateTime.now()) != 1) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "The authenticator or recovery code is invalid or already used");
            }
        }
        return issueStepUp(factor, sessionToken);
    }

    @Transactional(readOnly = true)
    public boolean isStepUpValid(String userId, String sessionToken, String stepUpToken) {
        if (stepUpToken == null || stepUpToken.isBlank() || sessionToken == null || sessionToken.isBlank()) return false;
        return factors.findById(userId).map(factor -> isStepUpValid(factor, sessionToken, stepUpToken)).orElse(false);
    }

    private boolean isStepUpValid(AdminMfaFactorEntity factor, String sessionToken, String stepUpToken) {
        // A missing step-up cookie is the normal state immediately after a
        // portal handoff. Report that MFA is required; never hash a null token.
        if (stepUpToken == null || stepUpToken.isBlank()
                || sessionToken == null || sessionToken.isBlank()) return false;
        if (!Integer.valueOf(1).equals(factor.getEnabled()) || factor.getStepUpExpiresAt() == null
                || !factor.getStepUpExpiresAt().isAfter(LocalDateTime.now())) return false;
        return constantTimeEquals(factor.getStepUpTokenHash(), hash(stepUpToken))
                && constantTimeEquals(factor.getStepUpSessionHash(), hash(sessionToken));
    }

    private String issueStepUp(AdminMfaFactorEntity factor, String sessionToken) {
        if (sessionToken == null || sessionToken.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "An active admin session is required");
        }
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes(32));
        factor.setStepUpTokenHash(hash(token));
        factor.setStepUpSessionHash(hash(sessionToken));
        factor.setStepUpExpiresAt(LocalDateTime.now().plusMinutes(STEP_UP_MINUTES));
        factor.setUpdatedAt(LocalDateTime.now());
        factors.save(factor);
        return token;
    }

    private byte[] deriveEncryptionKey(String rootSecret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(rootSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal("KuraliUpdates/AdminMFA/AES-GCM/v1".getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to derive admin MFA encryption key", ex);
        }
    }

    private String encrypt(String plaintext) {
        try {
            byte[] iv = randomBytes(12);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            ByteBuffer combined = ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(combined.array());
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to encrypt admin MFA secret", ex);
        }
    }

    private String decrypt(String ciphertext) {
        try {
            byte[] combined = Base64.getUrlDecoder().decode(ciphertext);
            if (combined.length < 29) throw new IllegalArgumentException("Invalid encrypted MFA secret");
            byte[] iv = new byte[12];
            byte[] encrypted = new byte[combined.length - iv.length];
            System.arraycopy(combined, 0, iv, 0, iv.length);
            System.arraycopy(combined, iv.length, encrypted, 0, encrypted.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey, new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to decrypt admin MFA secret; verify JWT_SECRET has not changed", ex);
        }
    }

    private Long matchingTotpCounter(String secret, String supplied, Instant now) {
        if (supplied == null || !supplied.matches("\\d{6}")) return null;
        byte[] expected = supplied.getBytes(StandardCharsets.US_ASCII);
        long currentCounter = now.getEpochSecond() / 30;
        for (long offset = 0; offset <= 1; offset++) {
            long counter = currentCounter + offset;
            String candidate = totpCode(secret, counter);
            if (MessageDigest.isEqual(candidate.getBytes(StandardCharsets.US_ASCII), expected)) return counter;
        }
        long previousCounter = currentCounter - 1;
        String previous = totpCode(secret, previousCounter);
        return MessageDigest.isEqual(previous.getBytes(StandardCharsets.US_ASCII), expected) ? previousCounter : null;
    }

    static String totpCode(String secret, Instant instant) {
        return totpCode(secret, instant.getEpochSecond() / 30);
    }

    private static String totpCode(String secret, long counter) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(base32Decode(secret), "HmacSHA1"));
            byte[] digest = mac.doFinal(ByteBuffer.allocate(8).putLong(counter).array());
            int offset = digest[digest.length - 1] & 0x0f;
            int binary = ((digest[offset] & 0x7f) << 24)
                    | ((digest[offset + 1] & 0xff) << 16)
                    | ((digest[offset + 2] & 0xff) << 8)
                    | (digest[offset + 3] & 0xff);
            return String.format(Locale.ROOT, "%06d", binary % 1_000_000);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to calculate TOTP code", ex);
        }
    }

    private String base32Encode(byte[] data) {
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;
        for (byte value : data) {
            buffer = (buffer << 8) | (value & 0xff);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                bitsLeft -= 5;
                result.append(BASE32.charAt((buffer >> bitsLeft) & 31));
            }
        }
        if (bitsLeft > 0) result.append(BASE32.charAt((buffer << (5 - bitsLeft)) & 31));
        return result.toString();
    }

    private static byte[] base32Decode(String value) {
        String normalized = value.toUpperCase(Locale.ROOT).replace("=", "").replace(" ", "");
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        int buffer = 0;
        int bitsLeft = 0;
        for (char character : normalized.toCharArray()) {
            int index = BASE32.indexOf(character);
            if (index < 0) throw new IllegalArgumentException("Invalid Base32 secret");
            buffer = (buffer << 5) | index;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                bitsLeft -= 8;
                output.write((buffer >> bitsLeft) & 0xff);
            }
        }
        return output.toByteArray();
    }

    private String formatRecoveryCode(String value) {
        return value.replaceAll("(.{4})(?!$)", "$1-");
    }

    private String normalizeRecoveryCode(String value) {
        return value == null ? "" : value.replace("-", "").replace(" ", "").toUpperCase(Locale.ROOT);
    }

    private String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private byte[] randomBytes(int count) {
        byte[] bytes = new byte[count];
        RANDOM.nextBytes(bytes);
        return bytes;
    }

    private String hash(String value) {
        try {
            return java.util.HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash admin MFA token", ex);
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        return left != null && right != null && MessageDigest.isEqual(
                left.getBytes(StandardCharsets.US_ASCII), right.getBytes(StandardCharsets.US_ASCII));
    }

    public record Status(boolean enabled, boolean stepUpValid) {}
    public record Enrollment(String secret, String otpauthUri) {}
    public record Confirmation(List<String> recoveryCodes, String stepUpToken) {}
}

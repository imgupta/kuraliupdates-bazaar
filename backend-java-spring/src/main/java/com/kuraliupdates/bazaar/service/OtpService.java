package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.AuthOtpEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.AuthOtpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OtpService {
    private final AuthOtpRepository repository;
    private final OtpDeliveryService deliveryService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public void send(String identifier, String type) {
        LocalDateTime now = LocalDateTime.now();
        if (repository.existsRecentOtp(identifier, type, now.minusSeconds(60))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Please wait 60 seconds before requesting another OTP");
        }

        String otp = String.format("%06d", 100000 + secureRandom.nextInt(900000));
        AuthOtpEntity entity = AuthOtpEntity.builder()
                .otpId("otp-" + UUID.randomUUID())
                .identifier(identifier)
                .otpCode(hash(otp))
                .otpType(type)
                .isUsed(0)
                .attempts(0)
                .expiresAt(now.plusMinutes(10))
                .createdAt(now)
                .build();

        try {
            deliveryService.sendOtp(identifier, type, otp, 10);
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Unable to deliver the verification code right now. Please try again later.");
        }
        repository.save(entity);
    }

    @Transactional
    public void verify(String identifier, String type, String otp) {
        if (otp == null || !otp.matches("\\d{6}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP must be 6 digits");
        }

        Optional<AuthOtpEntity> record = repository
                .findFirstByIdentifierAndOtpTypeAndIsUsedAndAttemptsLessThanAndExpiresAtAfterOrderByCreatedAtDesc(
                        identifier, type, 0, 5, LocalDateTime.now());

        if (record.isEmpty() || !matches(otp, record.get().getOtpCode())) {
            record.ifPresent(this::registerFailedAttempt);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid or expired OTP. Please request a new code.");
        }

        record.get().setIsUsed(1);
        repository.save(record.get());
    }

    private void registerFailedAttempt(AuthOtpEntity entity) {
        entity.setAttempts(entity.getAttempts() + 1);
        if (entity.getAttempts() >= 5) entity.setIsUsed(1);
        repository.save(entity);
    }

    private boolean matches(String entered, String storedHash) {
        return MessageDigest.isEqual(hash(entered).getBytes(StandardCharsets.UTF_8),
                storedHash.getBytes(StandardCharsets.UTF_8));
    }

    private String hash(String otp) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(otp.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash OTP", ex);
        }
    }
}

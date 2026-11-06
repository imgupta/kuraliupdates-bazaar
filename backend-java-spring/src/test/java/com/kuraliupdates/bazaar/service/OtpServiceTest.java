package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.AuthOtpEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.AuthOtpRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {
    @Mock private AuthOtpRepository repository;
    @Mock private OtpDeliveryService deliveryService;
    @Mock private E2eOtpCaptureService e2eOtpCaptureService;
    @Mock private JdbcTemplate jdbcTemplate;
    @InjectMocks private OtpService otpService;

    @Test
    void resendWithinConfiguredCooldownIsRejectedBeforeDeliveryOrPersistence() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(30);
        when(repository.existsRecentOtp(eq("buyer@example.test"), eq("BUYER_EMAIL"), any(LocalDateTime.class)))
                .thenReturn(true);

        ApiException error = assertThrows(ApiException.class,
                () -> otpService.send("buyer@example.test", "BUYER_EMAIL"));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
        verifyNoInteractions(deliveryService);
        verify(repository, never()).save(any(AuthOtpEntity.class));
    }

    @Test
    void fifthInvalidOtpAttemptConsumesTheOtpRecord() {
        AuthOtpEntity record = AuthOtpEntity.builder()
                .otpId("otp-test").identifier("buyer@example.test")
                .otpCode(hash("123456")).otpType("BUYER_EMAIL")
                .attempts(4).isUsed(0)
                .expiresAt(LocalDateTime.now().plusMinutes(5)).build();
        when(repository.findFirstByIdentifierAndOtpTypeAndIsUsedAndAttemptsLessThanAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("buyer@example.test"), eq("BUYER_EMAIL"), eq(0), eq(5), any(LocalDateTime.class)))
                .thenReturn(Optional.of(record));

        ApiException error = assertThrows(ApiException.class,
                () -> otpService.verify("buyer@example.test", "BUYER_EMAIL", "654321"));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        assertEquals(5, record.getAttempts());
        assertEquals(1, record.getIsUsed());
        verify(repository).save(record);
    }

    @Test
    void validOtpIsMarkedUsedAfterHashComparison() {
        AuthOtpEntity record = AuthOtpEntity.builder()
                .otpId("otp-valid").identifier("buyer@example.test")
                .otpCode(hash("123456")).otpType("BUYER_EMAIL")
                .attempts(0).isUsed(0)
                .expiresAt(LocalDateTime.now().plusMinutes(5)).build();
        when(repository.findFirstByIdentifierAndOtpTypeAndIsUsedAndAttemptsLessThanAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("buyer@example.test"), eq("BUYER_EMAIL"), eq(0), eq(5), any(LocalDateTime.class)))
                .thenReturn(Optional.of(record));

        otpService.verify("buyer@example.test", "BUYER_EMAIL", "123456");

        assertEquals(1, record.getIsUsed());
        assertEquals(0, record.getAttempts());
        verify(repository).save(record);
    }

    @Test
    void exhaustedOrExpiredOtpCannotBeVerifiedAgain() {
        when(repository.findFirstByIdentifierAndOtpTypeAndIsUsedAndAttemptsLessThanAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("buyer@example.test"), eq("BUYER_EMAIL"), eq(0), eq(5), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> otpService.verify("buyer@example.test", "BUYER_EMAIL", "123456"));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verify(repository, never()).save(any(AuthOtpEntity.class));
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }
}

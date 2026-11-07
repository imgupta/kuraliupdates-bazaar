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
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.DuplicateKeyException;

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
    @Mock private OtpAttemptService otpAttemptService;
    @InjectMocks private OtpService otpService;

    @Test
    void resendWithinConfiguredCooldownIsRejectedBeforeDeliveryOrPersistence() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(30);
        when(jdbcTemplate.update(startsWith("MERGE INTO API_RATE_LIMIT_BUCKETS"), any(), anyInt(), anyInt())).thenReturn(1);
        when(repository.existsRecentOtp(eq("buyer@example.test"), eq("BUYER_EMAIL"), any(LocalDateTime.class)))
                .thenReturn(true);

        ApiException error = assertThrows(ApiException.class,
                () -> otpService.send("buyer@example.test", "BUYER_EMAIL"));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
        verifyNoInteractions(deliveryService);
        verify(repository, never()).save(any(AuthOtpEntity.class));
    }


    @Test
    void concurrentResendIsRejectedByPersistentAtomicCooldownGuard() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(30);
        when(jdbcTemplate.update(startsWith("MERGE INTO API_RATE_LIMIT_BUCKETS"), any(), anyInt(), anyInt()))
                .thenReturn(0);

        ApiException error = assertThrows(ApiException.class,
                () -> otpService.send("buyer@example.test", "BUYER_EMAIL"));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
        verify(repository, never()).existsRecentOtp(anyString(), anyString(), any(LocalDateTime.class));
        verify(repository, never()).save(any(AuthOtpEntity.class));
        verifyNoInteractions(deliveryService);
    }

    @Test
    void oracleFirstInsertRaceRetriesAgainstWinningCooldownAndRejectsLoser() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(30);
        when(jdbcTemplate.update(startsWith("MERGE INTO API_RATE_LIMIT_BUCKETS"), any(), anyInt(), anyInt()))
                .thenThrow(new DuplicateKeyException("concurrent first insert"))
                .thenReturn(0);

        ApiException error = assertThrows(ApiException.class,
                () -> otpService.send("buyer@example.test", "BUYER_EMAIL"));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
        verify(jdbcTemplate, times(2))
                .update(startsWith("MERGE INTO API_RATE_LIMIT_BUCKETS"), any(), anyInt(), anyInt());
        verifyNoInteractions(deliveryService);
        verify(repository, never()).save(any(AuthOtpEntity.class));
    }

    @Test
    void cooldownGuardDatabaseFailureFailsClosedBeforeOtpDelivery() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(30);
        when(jdbcTemplate.update(startsWith("MERGE INTO API_RATE_LIMIT_BUCKETS"), any(), anyInt(), anyInt()))
                .thenThrow(new DataAccessResourceFailureException("synthetic Oracle outage"));

        ApiException error = assertThrows(ApiException.class,
                () -> otpService.send("buyer@example.test", "BUYER_EMAIL"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
        verifyNoInteractions(deliveryService);
        verify(repository, never()).save(any(AuthOtpEntity.class));
    }

    @Test
    void successfulResendUsesHashedIdentifierAndPersistsOtpAfterCooldownReservation() throws Exception {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(30);
        when(jdbcTemplate.update(startsWith("MERGE INTO API_RATE_LIMIT_BUCKETS"), any(), anyInt(), anyInt()))
                .thenReturn(1);
        when(repository.existsRecentOtp(eq("buyer@example.test"), eq("BUYER_EMAIL"), any(LocalDateTime.class)))
                .thenReturn(false);

        otpService.send("buyer@example.test", "BUYER_EMAIL");

        org.mockito.ArgumentCaptor<String> key = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(startsWith("MERGE INTO API_RATE_LIMIT_BUCKETS"),
                key.capture(), eq(30), eq(30));
        assertEquals(64, key.getValue().length());
        assertFalse(key.getValue().contains("buyer@example.test"));
        verify(deliveryService).sendOtp(eq("buyer@example.test"), eq("BUYER_EMAIL"), matches("\\d{6}"), eq(10));
        verify(repository).save(any(AuthOtpEntity.class));
    }


    @Test
    void unresolvedOracleDuplicateKeyRaceFailsClosed() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(30);
        when(jdbcTemplate.update(startsWith("MERGE INTO API_RATE_LIMIT_BUCKETS"), any(), anyInt(), anyInt()))
                .thenThrow(new DuplicateKeyException("first insert"))
                .thenThrow(new DuplicateKeyException("retry insert"));

        ApiException error = assertThrows(ApiException.class,
                () -> otpService.send("buyer@example.test", "BUYER_EMAIL"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
        verifyNoInteractions(deliveryService);
        verify(repository, never()).save(any(AuthOtpEntity.class));
    }

    @Test
    void allowlistedE2eCooldownBypassSkipsPersistentAndHistoricalCooldownChecks() throws Exception {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(30);
        when(e2eOtpCaptureService.mayBypassCooldown("buyer@example.test")).thenReturn(true);
        when(e2eOtpCaptureService.shouldSuppressEmailDelivery("buyer@example.test", "BUYER_EMAIL"))
                .thenReturn(true);

        otpService.send("buyer@example.test", "BUYER_EMAIL");

        verify(jdbcTemplate, never())
                .update(startsWith("MERGE INTO API_RATE_LIMIT_BUCKETS"), any(), anyInt(), anyInt());
        verify(repository, never()).existsRecentOtp(anyString(), anyString(), any(LocalDateTime.class));
        verify(repository).save(any(AuthOtpEntity.class));
        verify(e2eOtpCaptureService).capture(eq("buyer@example.test"), matches("\\d{6}"));
        verifyNoInteractions(deliveryService);
    }

    @Test
    void invalidOtpAttemptIsPersistedByIndependentAttemptService() {
        AuthOtpEntity record = otpRecord("otp-test", "123456");
        when(repository.findFirstByIdentifierAndOtpTypeAndIsUsedAndAttemptsLessThanAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("buyer@example.test"), eq("BUYER_EMAIL"), eq(0), eq(5), any(LocalDateTime.class)))
                .thenReturn(Optional.of(record));

        ApiException error = assertThrows(ApiException.class,
                () -> otpService.verify("buyer@example.test", "BUYER_EMAIL", "654321"));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verify(otpAttemptService).registerFailedAttempt(eq("otp-test"), any(LocalDateTime.class));
        verify(otpAttemptService, never()).consume(anyString(), any(LocalDateTime.class));
        verify(repository, never()).save(any(AuthOtpEntity.class));
    }

    @Test
    void validOtpIsConsumedAtomicallyByIndependentAttemptService() {
        AuthOtpEntity record = otpRecord("otp-valid", "123456");
        when(repository.findFirstByIdentifierAndOtpTypeAndIsUsedAndAttemptsLessThanAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("buyer@example.test"), eq("BUYER_EMAIL"), eq(0), eq(5), any(LocalDateTime.class)))
                .thenReturn(Optional.of(record));
        when(otpAttemptService.consume(eq("otp-valid"), any(LocalDateTime.class))).thenReturn(true);

        otpService.verify("buyer@example.test", "BUYER_EMAIL", "123456");

        verify(otpAttemptService).consume(eq("otp-valid"), any(LocalDateTime.class));
        verify(repository, never()).save(any(AuthOtpEntity.class));
    }

    @Test
    void validOtpIsRejectedWhenAnotherRequestAlreadyConsumedIt() {
        AuthOtpEntity record = otpRecord("otp-raced", "123456");
        when(repository.findFirstByIdentifierAndOtpTypeAndIsUsedAndAttemptsLessThanAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("buyer@example.test"), eq("BUYER_EMAIL"), eq(0), eq(5), any(LocalDateTime.class)))
                .thenReturn(Optional.of(record));
        when(otpAttemptService.consume(eq("otp-raced"), any(LocalDateTime.class))).thenReturn(false);

        ApiException error = assertThrows(ApiException.class,
                () -> otpService.verify("buyer@example.test", "BUYER_EMAIL", "123456"));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verify(otpAttemptService).consume(eq("otp-raced"), any(LocalDateTime.class));
    }

    @Test
    void exhaustedOrExpiredOtpCannotBeVerifiedAgain() {
        when(repository.findFirstByIdentifierAndOtpTypeAndIsUsedAndAttemptsLessThanAndExpiresAtAfterOrderByCreatedAtDesc(
                eq("buyer@example.test"), eq("BUYER_EMAIL"), eq(0), eq(5), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> otpService.verify("buyer@example.test", "BUYER_EMAIL", "123456"));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verifyNoInteractions(otpAttemptService);
        verify(repository, never()).save(any(AuthOtpEntity.class));
    }

    private AuthOtpEntity otpRecord(String id, String otp) {
        return AuthOtpEntity.builder().otpId(id).identifier("buyer@example.test")
                .otpCode(hash(otp)).otpType("BUYER_EMAIL").attempts(0).isUsed(0)
                .expiresAt(LocalDateTime.now().plusMinutes(5)).build();
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

package com.kuraliupdates.bazaar.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:otp_attempts;MODE=Oracle;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@Import(OtpAttemptService.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class OtpAttemptServiceJdbcTest {
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private OtpAttemptService otpAttemptService;
    @Autowired private PlatformTransactionManager transactionManager;

    @BeforeEach
    void createIsolatedOtpTables() {
        jdbcTemplate.execute("""
                CREATE TABLE AUTH_OTPS (
                    OTP_ID VARCHAR(64) PRIMARY KEY,
                    ATTEMPTS INTEGER NOT NULL DEFAULT 0,
                    IS_USED INTEGER NOT NULL DEFAULT 0,
                    EXPIRES_AT TIMESTAMP NOT NULL
                )
                """);
        jdbcTemplate.execute("CREATE TABLE OUTER_TX_MARKER (ID INTEGER PRIMARY KEY)");
        jdbcTemplate.update("INSERT INTO AUTH_OTPS (OTP_ID, ATTEMPTS, IS_USED, EXPIRES_AT) VALUES (?, 0, 0, ?)",
                "otp-1", java.sql.Timestamp.valueOf(LocalDateTime.now().plusMinutes(5)));
    }

    @Test
    void failedAttemptsCommitEvenWhenTheEnclosingTransactionRollsBack() {
        TransactionTemplate outer = new TransactionTemplate(transactionManager);
        assertThrows(IllegalStateException.class, () -> outer.executeWithoutResult(status -> {
            jdbcTemplate.update("INSERT INTO OUTER_TX_MARKER (ID) VALUES (1)");
            otpAttemptService.registerFailedAttempt("otp-1", LocalDateTime.now());
            throw new IllegalStateException("force outer rollback");
        }));

        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT ATTEMPTS FROM AUTH_OTPS WHERE OTP_ID=?", Integer.class, "otp-1"));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM OUTER_TX_MARKER", Integer.class));
    }

    @Test
    void fifthFailureConsumesOtpAndLaterFailuresCannotIncrementIt() {
        for (int i = 0; i < 5; i++) {
            otpAttemptService.registerFailedAttempt("otp-1", LocalDateTime.now());
        }
        otpAttemptService.registerFailedAttempt("otp-1", LocalDateTime.now());

        assertEquals(5, jdbcTemplate.queryForObject(
                "SELECT ATTEMPTS FROM AUTH_OTPS WHERE OTP_ID=?", Integer.class, "otp-1"));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT IS_USED FROM AUTH_OTPS WHERE OTP_ID=?", Integer.class, "otp-1"));
    }

    @Test
    void consumeIsOneTimeAndCannotConsumeExpiredOtp() {
        assertTrue(otpAttemptService.consume("otp-1", LocalDateTime.now()));
        assertFalse(otpAttemptService.consume("otp-1", LocalDateTime.now()));

        jdbcTemplate.update("INSERT INTO AUTH_OTPS (OTP_ID, ATTEMPTS, IS_USED, EXPIRES_AT) VALUES (?, 0, 0, ?)",
                "otp-expired", java.sql.Timestamp.valueOf(LocalDateTime.now().minusSeconds(1)));
        assertFalse(otpAttemptService.consume("otp-expired", LocalDateTime.now()));
        otpAttemptService.registerFailedAttempt("otp-expired", LocalDateTime.now());

        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT ATTEMPTS FROM AUTH_OTPS WHERE OTP_ID=?", Integer.class, "otp-expired"));
    }
}

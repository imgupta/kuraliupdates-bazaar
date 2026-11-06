package com.kuraliupdates.bazaar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;

/**
 * Persists OTP consumption and failed-attempt counters independently of an
 * enclosing login/registration transaction. The conditional UPDATE statements
 * serialize concurrent attempts at the database row and use affected-row counts
 * as the authoritative outcome.
 */
@Service
@RequiredArgsConstructor
public class OtpAttemptService {
    private final JdbcTemplate jdbcTemplate;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registerFailedAttempt(String otpId, LocalDateTime now) {
        jdbcTemplate.update("""
                UPDATE AUTH_OTPS
                   SET ATTEMPTS = ATTEMPTS + 1,
                       IS_USED = CASE WHEN ATTEMPTS + 1 >= 5 THEN 1 ELSE IS_USED END
                 WHERE OTP_ID = ?
                   AND IS_USED = 0
                   AND ATTEMPTS < 5
                   AND EXPIRES_AT > ?
                """, otpId, Timestamp.valueOf(now));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean consume(String otpId, LocalDateTime now) {
        return jdbcTemplate.update("""
                UPDATE AUTH_OTPS
                   SET IS_USED = 1
                 WHERE OTP_ID = ?
                   AND IS_USED = 0
                   AND ATTEMPTS < 5
                   AND EXPIRES_AT > ?
                """, otpId, Timestamp.valueOf(now)) == 1;
    }
}

package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SellerRegistrationOtpConfigService {
    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public Map<String, Object> get() {
        return jdbc.queryForObject("SELECT EMAIL_OTP_ENABLED, MOBILE_OTP_ENABLED, UPDATED_BY, UPDATED_AT FROM SELLER_REGISTRATION_OTP_CONFIG WHERE CONFIG_ID='GLOBAL'",
            (rs, row) -> {
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("emailOtpEnabled", rs.getInt("EMAIL_OTP_ENABLED") == 1);
                result.put("mobileOtpEnabled", rs.getInt("MOBILE_OTP_ENABLED") == 1);
                result.put("updatedBy", rs.getString("UPDATED_BY"));
                result.put("updatedAt", rs.getTimestamp("UPDATED_AT"));
                return result;
            });
    }

    @Transactional
    public Map<String, Object> update(boolean emailEnabled, boolean mobileEnabled, String actor) {
        if (!emailEnabled && !mobileEnabled) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "At least one seller contact verification channel must remain enabled");
        }
        Map<String, Object> previous = get();
        String changedBy = actor == null || actor.isBlank() ? "ADMIN" : actor.substring(0, Math.min(actor.length(), 150));
        LocalDateTime now = LocalDateTime.now();
        boolean oldEmail = Boolean.TRUE.equals(previous.get("emailOtpEnabled"));
        boolean oldMobile = Boolean.TRUE.equals(previous.get("mobileOtpEnabled"));
        if (oldEmail != emailEnabled || oldMobile != mobileEnabled) {
            jdbc.update("INSERT INTO SELLER_REGISTRATION_OTP_CONFIG_AUDIT (AUDIT_ID, EMAIL_OTP_ENABLED, MOBILE_OTP_ENABLED, PREVIOUS_EMAIL_OTP_ENABLED, PREVIOUS_MOBILE_OTP_ENABLED, CHANGED_BY, CHANGED_AT) VALUES (?,?,?,?,?,?,?)",
                UUID.randomUUID().toString(), emailEnabled ? 1 : 0, mobileEnabled ? 1 : 0,
                oldEmail ? 1 : 0, oldMobile ? 1 : 0, changedBy, now);
            jdbc.update("UPDATE SELLER_REGISTRATION_OTP_CONFIG SET EMAIL_OTP_ENABLED=?, MOBILE_OTP_ENABLED=?, UPDATED_BY=?, UPDATED_AT=? WHERE CONFIG_ID='GLOBAL'",
                emailEnabled ? 1 : 0, mobileEnabled ? 1 : 0, changedBy, now);
        }
        return get();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> history(int requestedLimit) {
        int limit = Math.max(1, Math.min(50, requestedLimit));
        return jdbc.query("SELECT AUDIT_ID, EMAIL_OTP_ENABLED, MOBILE_OTP_ENABLED, PREVIOUS_EMAIL_OTP_ENABLED, PREVIOUS_MOBILE_OTP_ENABLED, CHANGED_BY, CHANGED_AT FROM SELLER_REGISTRATION_OTP_CONFIG_AUDIT ORDER BY CHANGED_AT DESC FETCH FIRST " + limit + " ROWS ONLY",
            (rs, row) -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("auditId", rs.getString("AUDIT_ID"));
                item.put("emailOtpEnabled", rs.getInt("EMAIL_OTP_ENABLED") == 1);
                item.put("mobileOtpEnabled", rs.getInt("MOBILE_OTP_ENABLED") == 1);
                item.put("previousEmailOtpEnabled", rs.getInt("PREVIOUS_EMAIL_OTP_ENABLED") == 1);
                item.put("previousMobileOtpEnabled", rs.getInt("PREVIOUS_MOBILE_OTP_ENABLED") == 1);
                item.put("changedBy", rs.getString("CHANGED_BY"));
                item.put("changedAt", rs.getTimestamp("CHANGED_AT"));
                return item;
            });
    }
}

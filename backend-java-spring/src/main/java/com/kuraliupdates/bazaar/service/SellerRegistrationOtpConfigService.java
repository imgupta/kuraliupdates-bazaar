package com.kuraliupdates.bazaar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SellerRegistrationOtpConfigService {
    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public Map<String, Object> get() {
        return jdbc.queryForObject(
                "SELECT EMAIL_OTP_ENABLED, MOBILE_OTP_ENABLED, UPDATED_BY, UPDATED_AT FROM SELLER_REGISTRATION_OTP_CONFIG WHERE CONFIG_ID='GLOBAL'",
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
        jdbc.update("UPDATE SELLER_REGISTRATION_OTP_CONFIG SET EMAIL_OTP_ENABLED=?, MOBILE_OTP_ENABLED=?, UPDATED_BY=?, UPDATED_AT=? WHERE CONFIG_ID='GLOBAL'",
                emailEnabled ? 1 : 0, mobileEnabled ? 1 : 0,
                actor == null || actor.isBlank() ? "ADMIN" : actor.substring(0, Math.min(actor.length(), 150)),
                LocalDateTime.now());
        return get();
    }

    public boolean emailEnabled() { return Boolean.TRUE.equals(get().get("emailOtpEnabled")); }
    public boolean mobileEnabled() { return Boolean.TRUE.equals(get().get("mobileOtpEnabled")); }
}

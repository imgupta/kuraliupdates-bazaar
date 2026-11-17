package com.kuraliupdates.bazaar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/** Reads operational delivery settings; order lifecycle orchestration stays in OrderService. */
@Service
@RequiredArgsConstructor
public class DeliveryConfigurationService {
    private final JdbcTemplate jdbc;

    public boolean isStorePickupEnabled() {
        Integer enabled = jdbc.queryForObject(
                "SELECT STORE_PICKUP_ENABLED FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID=1", Integer.class);
        return Integer.valueOf(1).equals(enabled);
    }

    public int maxSellersPerBatch() {
        Integer configured = jdbc.queryForObject(
                "SELECT MAX_SELLERS_PER_BATCH FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID=1", Integer.class);
        return configured == null ? 3 : Math.min(configured, 10);
    }

    public BigDecimal customerBaseFee() {
        return decimalSetting("CUSTOMER_BASE_FEE", BigDecimal.valueOf(35));
    }

    public BigDecimal customerPerKmFee() {
        return decimalSetting("CUSTOMER_PER_KM_FEE", BigDecimal.ZERO);
    }

    private BigDecimal decimalSetting(String column, BigDecimal fallback) {
        // Column names are private constants at call sites; callers cannot supply SQL fragments.
        BigDecimal value = jdbc.queryForObject(
                "SELECT " + column + " FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID=1", BigDecimal.class);
        return value == null ? fallback : value;
    }
}

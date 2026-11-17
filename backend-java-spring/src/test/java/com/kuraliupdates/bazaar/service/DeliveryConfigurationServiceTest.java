package com.kuraliupdates.bazaar.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeliveryConfigurationServiceTest {
    @Mock private JdbcTemplate jdbc;
    @InjectMocks private DeliveryConfigurationService service;

    @Test
    void storePickupRequiresAnExplicitEnabledFlag() {
        when(jdbc.queryForObject(contains("STORE_PICKUP_ENABLED"), eq(Integer.class))).thenReturn(1);
        assertTrue(service.isStorePickupEnabled());
        when(jdbc.queryForObject(contains("STORE_PICKUP_ENABLED"), eq(Integer.class))).thenReturn(null);
        assertFalse(service.isStorePickupEnabled());
    }

    @Test
    void sellerBatchLimitUsesSafeDefaultAndCapsConfiguration() {
        when(jdbc.queryForObject(contains("MAX_SELLERS_PER_BATCH"), eq(Integer.class))).thenReturn(null);
        assertEquals(3, service.maxSellersPerBatch());
        when(jdbc.queryForObject(contains("MAX_SELLERS_PER_BATCH"), eq(Integer.class))).thenReturn(50);
        assertEquals(10, service.maxSellersPerBatch());
    }

    @Test
    void customerDeliveryFeesUseDocumentedDefaultsWhenUnset() {
        when(jdbc.queryForObject(contains("CUSTOMER_BASE_FEE"), eq(BigDecimal.class))).thenReturn(null);
        when(jdbc.queryForObject(contains("CUSTOMER_PER_KM_FEE"), eq(BigDecimal.class))).thenReturn(null);
        assertEquals(new BigDecimal("35"), service.customerBaseFee());
        assertEquals(BigDecimal.ZERO, service.customerPerKmFee());
    }
}

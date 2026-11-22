package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SellerDirectPaymentServiceTest {
    @Mock private JdbcTemplate jdbc;
    @InjectMocks private SellerDirectPaymentService service;

    @Test
    void createsSellerOwnedPaymentFromVerifiedActiveDestinationAndSnapshotsAmount() {
        when(jdbc.queryForMap(anyString(), any(Object[].class)))
                .thenReturn(Map.of("UPI_ID", "store@okaxis", "PAYEE_NAME", "Kurali Store"));
        SellerEntity seller = SellerEntity.builder().sellerId("SELLER-1").status("APPROVED").build();
        OrderEntity order = OrderEntity.builder().orderId("ORDER-1").seller(seller)
                .buyerEmail("buyer@example.test").paymentMethod("UPI")
                .totalAmount(new BigDecimal("125.50")).build();

        service.createForOrder(order, "USER-BUYER-1");

        assertEquals("PENDING_UPI", order.getPaymentStatus());
        verify(jdbc).update(contains("INSERT INTO ORDER_SELLER_PAYMENTS"), any(Object[].class));
        verify(jdbc).update(contains("UPDATE ORDERS SET PAYMENT_STATUS='PENDING_UPI'"), eq("ORDER-1"));
    }

    @Test
    void refusesToCreatePaymentWhenSellerDestinationIsNotVerifiedAndActive() {
        when(jdbc.queryForMap(anyString(), any(Object[].class)))
                .thenThrow(new EmptyResultDataAccessException(1));
        SellerEntity seller = SellerEntity.builder().sellerId("SELLER-2").status("APPROVED").build();
        OrderEntity order = OrderEntity.builder().orderId("ORDER-2").seller(seller)
                .paymentMethod("UPI").totalAmount(BigDecimal.TEN).build();

        ApiException error = assertThrows(ApiException.class, () -> service.createForOrder(order, "USER-BUYER-2"));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(jdbc, never()).update(contains("INSERT INTO ORDER_SELLER_PAYMENTS"), any(Object[].class));
    }
}

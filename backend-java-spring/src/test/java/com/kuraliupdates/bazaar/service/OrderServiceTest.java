package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.order.PlaceOrderRequest;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock private OrderRepository orderRepository;
    @Mock private SellerRepository sellerRepository;
    @InjectMocks private OrderService orderService;

    @Test
    void placesCashOnDeliveryOrderWithPendingPaymentAndGeneratedOtp() {
        SellerEntity seller = SellerEntity.builder().sellerId("SELLER-1").storeName("Kurali Store").build();
        when(sellerRepository.findById("SELLER-1")).thenReturn(Optional.of(seller));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = orderService.placeOrder(request("COD", BigDecimal.ZERO));

        assertEquals("PLACED", result.order().status());
        assertEquals("PENDING_COD", result.order().paymentStatus());
        assertEquals(Integer.valueOf(1), result.order().isFreeDelivery());
        assertNotNull(result.order().orderId());
        assertTrue(result.deliveryOtp().matches("\\d{4}"));
        verify(orderRepository).save(any(OrderEntity.class));
    }

    @Test
    void missingSellerRejectsOrderWithoutPersisting() {
        when(sellerRepository.findById("missing")).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> orderService.placeOrder(new PlaceOrderRequest(
                        "Buyer", "9876543210", null, "House 1", "Kurali", "missing",
                        BigDecimal.TEN, null, null, BigDecimal.TEN, "COD", null, null, null, null)));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verify(orderRepository, never()).save(any());
    }

    private PlaceOrderRequest request(String paymentMethod, BigDecimal deliveryFee) {
        return new PlaceOrderRequest(" Buyer ", "9876543210", "BUYER@EXAMPLE.COM",
                " House 1 ", " Kurali ", "SELLER-1", BigDecimal.valueOf(200),
                BigDecimal.ZERO, deliveryFee, BigDecimal.valueOf(200).add(deliveryFee),
                paymentMethod, null, 30.0, 76.5, "kurali-place");
    }
}

package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.order.OrderItemRequest;
import com.kuraliupdates.bazaar.dto.order.PlaceOrderRequest;
import com.kuraliupdates.bazaar.entity.ProductEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock private OrderRepository orderRepository;
    @Mock private SellerRepository sellerRepository;
    @Mock private ProductRepository productRepository;
    @Mock private JdbcTemplate jdbc;
    @InjectMocks private OrderService orderService;

    @Test
    void placesOrderPersistsLineItemsAndReservesStockExactlyOnce() {
        SellerEntity seller = seller();
        ProductEntity product = ProductEntity.builder().productId("P-1").seller(seller)
                .title("Synthetic Test Product").sellerPrice(BigDecimal.valueOf(20))
                .additionalDiscountPercent(BigDecimal.ZERO).stock(5).build();
        when(productRepository.findLockedByProductId("P-1")).thenReturn(Optional.of(product));
        when(sellerRepository.findById("SELLER-1")).thenReturn(Optional.of(seller));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = orderService.placeOrder(request("COD", List.of(new OrderItemRequest("P-1", 2, null))), buyer());

        assertEquals("PLACED", result.order().status());
        assertEquals("authenticated@example.test", result.order().buyerEmail());
        assertEquals("Authenticated Buyer", result.order().buyerName());
        assertEquals("PENDING_COD", result.order().paymentStatus());
        assertNotNull(result.order().orderId());
        assertTrue(result.deliveryOtp().matches("\\d{4}"));
        assertEquals(3, product.getStock());
        assertEquals(1, result.order().items().size());
        assertEquals(2, result.order().items().get(0).quantity());
        assertEquals(new BigDecimal("40.00"), result.order().subtotal());
        verify(orderRepository).save(any(OrderEntity.class));
    }

    @Test
    void rejectsInsufficientStockWithoutPersistingOrder() {
        SellerEntity seller = seller();
        ProductEntity product = ProductEntity.builder().productId("P-1").seller(seller)
                .title("Synthetic Test Product").sellerPrice(BigDecimal.valueOf(20))
                .additionalDiscountPercent(BigDecimal.ZERO).stock(1).build();
        when(productRepository.findLockedByProductId("P-1")).thenReturn(Optional.of(product));

        ApiException error = assertThrows(ApiException.class,
                () -> orderService.placeOrder(request("COD", List.of(new OrderItemRequest("P-1", 2, null))), buyer()));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals(1, product.getStock());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void rejectsOnlinePaymentUntilGatewayIsConfigured() {
        ApiException error = assertThrows(ApiException.class,
                () -> orderService.placeOrder(request("UPI", List.of(new OrderItemRequest("P-1", 1, null))), buyer()));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(productRepository, never()).findLockedByProductId(anyString());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void rejectsClientSuppliedNegotiatedPriceWithoutAcceptedServerOffer() {
        SellerEntity seller = seller();
        ProductEntity product = ProductEntity.builder().productId("P-1").seller(seller)
                .title("Synthetic Test Product").sellerPrice(BigDecimal.valueOf(20))
                .additionalDiscountPercent(BigDecimal.ZERO).stock(5).build();
        when(productRepository.findLockedByProductId("P-1")).thenReturn(Optional.of(product));

        ApiException error = assertThrows(ApiException.class,
                () -> orderService.placeOrder(request("COD", List.of(
                        new OrderItemRequest("P-1", 1, BigDecimal.valueOf(1), null))), buyer()));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void rejectsMissingProductWithoutPersistingOrder() {
        when(productRepository.findLockedByProductId("missing")).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> orderService.placeOrder(request("COD", List.of(new OrderItemRequest("missing", 1, null))), buyer()));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verify(orderRepository, never()).save(any());
    }

    private UserEntity buyer() {
        return UserEntity.builder().userId("USER-1").name("Authenticated Buyer")
                .email("authenticated@example.test").phone("9876543210").role("BUYER").build();
    }

    private SellerEntity seller() {
        return SellerEntity.builder().sellerId("SELLER-1").storeName("Synthetic Store")
                .status("APPROVED").minOrderForFreeDelivery(BigDecimal.valueOf(499))
                .baseDeliveryFee(BigDecimal.valueOf(35)).build();
    }

    private PlaceOrderRequest request(String paymentMethod, List<OrderItemRequest> items) {
        return new PlaceOrderRequest("Synthetic Buyer", "9876543210", "buyer@example.test",
                "Synthetic Test Address", "Kurali", "SELLER-1", BigDecimal.valueOf(200),
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.valueOf(200),
                paymentMethod, null, 30.0, 76.5, "synthetic-place", items);
    }
}

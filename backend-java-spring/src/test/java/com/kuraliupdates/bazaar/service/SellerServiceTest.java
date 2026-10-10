package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.BillDiscountRepository;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SellerServiceTest {
    private static final String TOKEN = "seller-session-token";

    @Mock private AuthService authService;
    @Mock private SellerRepository sellerRepository;
    @Mock private ProductRepository productRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private BillDiscountRepository billDiscountRepository;
    @InjectMocks private SellerService sellerService;

    @Test
    void sellerCanAcceptPlacedOrder() {
        SellerEntity seller = approvedSeller("SELLER-1");
        OrderEntity order = order(seller, "PLACED");
        stubSeller(seller);
        when(orderRepository.findById("ORD-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderEntity updated = sellerService.updateOrderStatus(TOKEN, "ORD-1", "accepted_by_seller");

        assertEquals("ACCEPTED_BY_SELLER", updated.getStatus());
        assertNotNull(updated.getUpdatedAt());
        verify(orderRepository).save(order);
    }

    @Test
    void sellerCanMarkAcceptedOrderReadyForPickup() {
        SellerEntity seller = approvedSeller("SELLER-1");
        OrderEntity order = order(seller, "ACCEPTED_BY_SELLER");
        stubSeller(seller);
        when(orderRepository.findById("ORD-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderEntity updated = sellerService.updateOrderStatus(TOKEN, "ORD-1", "READY_FOR_PICKUP");

        assertEquals("READY_FOR_PICKUP", updated.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    void sellerCanCancelPlacedOrder() {
        SellerEntity seller = approvedSeller("SELLER-1");
        OrderEntity order = order(seller, "PLACED");
        stubSeller(seller);
        when(orderRepository.findById("ORD-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderEntity updated = sellerService.updateOrderStatus(TOKEN, "ORD-1", "CANCELLED");

        assertEquals("CANCELLED", updated.getStatus());
        verify(orderRepository).save(order);
    }

    @Test
    void sellerCannotSkipAcceptanceAndMarkPlacedOrderReadyForPickup() {
        SellerEntity seller = approvedSeller("SELLER-1");
        OrderEntity order = order(seller, "PLACED");
        stubSeller(seller);
        when(orderRepository.findById("ORD-1")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> sellerService.updateOrderStatus(TOKEN, "ORD-1", "READY_FOR_PICKUP"));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("PLACED", order.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void sellerCannotChangeReadyOrderBackwardsOrCancelIt() {
        SellerEntity seller = approvedSeller("SELLER-1");
        OrderEntity order = order(seller, "READY_FOR_PICKUP");
        stubSeller(seller);
        when(orderRepository.findById("ORD-1")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> sellerService.updateOrderStatus(TOKEN, "ORD-1", "ACCEPTED_BY_SELLER"));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("READY_FOR_PICKUP", order.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void sellerCannotUpdateAnotherStoresOrder() {
        SellerEntity seller = approvedSeller("SELLER-1");
        SellerEntity otherSeller = approvedSeller("SELLER-2");
        OrderEntity order = order(otherSeller, "PLACED");
        stubSeller(seller);
        when(orderRepository.findById("ORD-1")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> sellerService.updateOrderStatus(TOKEN, "ORD-1", "ACCEPTED_BY_SELLER"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void unsupportedSellerStatusIsRejectedAsBadRequest() {
        SellerEntity seller = approvedSeller("SELLER-1");
        OrderEntity order = order(seller, "PLACED");
        stubSeller(seller);
        when(orderRepository.findById("ORD-1")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> sellerService.updateOrderStatus(TOKEN, "ORD-1", "DELIVERED"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void sellerOrderListIsScopedToAuthenticatedStore() {
        SellerEntity seller = approvedSeller("SELLER-1");
        List<OrderEntity> expected = List.of(order(seller, "PLACED"));
        stubSeller(seller);
        when(orderRepository.findBySeller_SellerId("SELLER-1")).thenReturn(expected);

        assertSame(expected, sellerService.getOrders(TOKEN));
        verify(orderRepository).findBySeller_SellerId("SELLER-1");
        verify(orderRepository, never()).findAll();
    }

    private void stubSeller(SellerEntity seller) {
        when(authService.requireUser(TOKEN)).thenReturn(
                UserEntity.builder().email("seller@example.com").name("Store Owner").role("SELLER").build());
        when(sellerRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(seller));
    }

    private SellerEntity approvedSeller(String sellerId) {
        return SellerEntity.builder()
                .sellerId(sellerId)
                .storeName("Kurali Store")
                .ownerName("Store Owner")
                .email("seller@example.com")
                .phone("9876543210")
                .category("GROCERY")
                .address("Kurali")
                .locality("Kurali")
                .status("APPROVED")
                .build();
    }

    private OrderEntity order(SellerEntity seller, String status) {
        return OrderEntity.builder()
                .orderId("ORD-1")
                .seller(seller)
                .buyerName("Buyer")
                .buyerPhone("9876500000")
                .deliveryAddress("House 1")
                .deliveryLocality("Kurali")
                .subtotal(BigDecimal.valueOf(200))
                .totalAmount(BigDecimal.valueOf(200))
                .paymentMethod("COD")
                .paymentStatus("PENDING_COD")
                .status(status)
                .deliveryOtp("1234")
                .build();
    }
}

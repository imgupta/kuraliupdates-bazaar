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
import org.springframework.jdbc.core.ResultSetExtractor;
import org.mockito.ArgumentMatchers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock private OrderRepository orderRepository;
    @Mock private SellerRepository sellerRepository;
    @Mock private ProductRepository productRepository;
    @Mock private JdbcTemplate jdbc;
    @Mock private GoogleRoutesService googleRoutesService;
    @InjectMocks private OrderService orderService;

    @Test
    void missingBuyerIdentityCannotPlaceSingleSellerOrderBeforeRepositoryAccess() {
        ApiException error = assertThrows(ApiException.class,
                () -> orderService.placeOrder(null, null));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verifyNoInteractions(orderRepository, sellerRepository, productRepository, jdbc, googleRoutesService);
    }

    @Test
    void missingBuyerIdentityCannotPlaceMultiSellerOrderBeforeRepositoryAccess() {
        ApiException error = assertThrows(ApiException.class,
                () -> orderService.placeMultiSellerOrder(null, null, null));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verifyNoInteractions(orderRepository, sellerRepository, productRepository, jdbc, googleRoutesService);
    }

    @Test
    void missingBuyerIdentityCannotReadBuyerOrderHistory() {
        ApiException error = assertThrows(ApiException.class,
                () -> orderService.history(null));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verify(orderRepository, never()).findByBuyerEmail(anyString());
    }

    @Test
    void buyerOrderHistoryUsesAuthenticatedBuyerEmail() {
        when(orderRepository.findByBuyerEmail("authenticated@example.test")).thenReturn(List.of());

        var history = orderService.history(buyer());

        assertTrue(history.isEmpty());
        verify(orderRepository).findByBuyerEmail("authenticated@example.test");
        verifyNoMoreInteractions(orderRepository);
    }

    @Test
    void buyerCancellationRestoresStockAndIsIdempotent() {
        ProductEntity product = ProductEntity.builder().productId("P-CANCEL").stock(3).build();
        var item = com.kuraliupdates.bazaar.entity.OrderItemEntity.builder()
                .itemId("I-CANCEL").product(product).quantity(2).build();
        OrderEntity order = OrderEntity.builder().orderId("ORD-CANCEL")
                .buyerEmail("authenticated@example.test").status("PLACED")
                .paymentStatus("PENDING_COD").items(new java.util.ArrayList<>(List.of(item))).build();
        when(orderRepository.findById("ORD-CANCEL")).thenReturn(Optional.of(order));
        when(orderRepository.findLockedByOrderId("ORD-CANCEL")).thenReturn(Optional.of(order));
        when(productRepository.findLockedByProductId("P-CANCEL")).thenReturn(Optional.of(product));
        when(orderRepository.saveAll(any(Iterable.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = orderService.cancelOrderForBuyer("ORD-CANCEL", buyer());

        assertEquals("CANCELLED", response.status());
        assertEquals("PENDING_COD", order.getPaymentStatus());
        assertEquals(5, product.getStock());
        orderService.cancelOrderForBuyer("ORD-CANCEL", buyer());
        assertEquals(5, product.getStock());
        verify(productRepository, times(1)).findLockedByProductId("P-CANCEL");
    }

    @Test
    void buyerCannotCancelAnotherBuyersOrder() {
        OrderEntity order = OrderEntity.builder().orderId("ORD-OTHER")
                .buyerEmail("someone-else@example.test").status("PLACED").build();
        when(orderRepository.findById("ORD-OTHER")).thenReturn(Optional.of(order));
        when(orderRepository.findLockedByOrderId("ORD-OTHER")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> orderService.cancelOrderForBuyer("ORD-OTHER", buyer()));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verifyNoInteractions(productRepository);
        verify(orderRepository, never()).saveAll(any(Iterable.class));
    }

    @Test
    void paidOrAlreadyFulfilledBuyerOrderCannotBeCancelled() {
        OrderEntity paid = OrderEntity.builder().orderId("ORD-PAID")
                .buyerEmail("authenticated@example.test").status("PLACED")
                .paymentStatus("PAID").build();
        when(orderRepository.findById("ORD-PAID")).thenReturn(Optional.of(paid));
        when(orderRepository.findLockedByOrderId("ORD-PAID")).thenReturn(Optional.of(paid));
        ApiException paidError = assertThrows(ApiException.class,
                () -> orderService.cancelOrderForBuyer("ORD-PAID", buyer()));
        assertEquals(HttpStatus.CONFLICT, paidError.getStatus());

        OrderEntity fulfilled = OrderEntity.builder().orderId("ORD-DONE")
                .buyerEmail("authenticated@example.test").status("READY_FOR_PICKUP")
                .paymentStatus("PENDING_COD").build();
        when(orderRepository.findById("ORD-DONE")).thenReturn(Optional.of(fulfilled));
        when(orderRepository.findLockedByOrderId("ORD-DONE")).thenReturn(Optional.of(fulfilled));
        ApiException fulfilledError = assertThrows(ApiException.class,
                () -> orderService.cancelOrderForBuyer("ORD-DONE", buyer()));
        assertEquals(HttpStatus.CONFLICT, fulfilledError.getStatus());
        verifyNoInteractions(productRepository);
    }

    @Test
    void multiSellerBuyerCancellationRestoresAllGroupStockInDeterministicOrder() {
        ProductEntity p1 = ProductEntity.builder().productId("P-1").stock(1).build();
        ProductEntity p2 = ProductEntity.builder().productId("P-2").stock(4).build();
        OrderEntity first = OrderEntity.builder().orderId("ORD-G1").checkoutGroupId("CHK-1")
                .buyerEmail("authenticated@example.test").status("PLACED").paymentStatus("PENDING_COD")
                .items(new java.util.ArrayList<>(List.of(com.kuraliupdates.bazaar.entity.OrderItemEntity.builder()
                        .itemId("I-1").product(p1).quantity(2).build()))).build();
        OrderEntity second = OrderEntity.builder().orderId("ORD-G2").checkoutGroupId("CHK-1")
                .buyerEmail("authenticated@example.test").status("ACCEPTED_BY_SELLER").paymentStatus("PENDING_COD")
                .items(new java.util.ArrayList<>(List.of(com.kuraliupdates.bazaar.entity.OrderItemEntity.builder()
                        .itemId("I-2").product(p2).quantity(3).build()))).build();
        when(orderRepository.findById("ORD-G1")).thenReturn(Optional.of(first));
        when(orderRepository.findLockedByCheckoutGroupId("CHK-1")).thenReturn(List.of(first, second));
        when(productRepository.findLockedByProductId("P-1")).thenReturn(Optional.of(p1));
        when(productRepository.findLockedByProductId("P-2")).thenReturn(Optional.of(p2));
        when(orderRepository.saveAll(any(Iterable.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = orderService.cancelOrderForBuyer("ORD-G1", buyer());

        assertEquals("CANCELLED", response.status());
        assertEquals(3, p1.getStock());
        assertEquals(7, p2.getStock());
        assertEquals("CANCELLED", second.getStatus());
        var order = inOrder(productRepository);
        order.verify(productRepository).findLockedByProductId("P-1");
        order.verify(productRepository).findLockedByProductId("P-2");
    }

    @Test
    void buyerCancellationDoesNotRestoreStockAgainForSellerCancelledSuborder() {
        ProductEntity alreadyRestored = ProductEntity.builder().productId("P-OLD").stock(3).build();
        ProductEntity stillReserved = ProductEntity.builder().productId("P-NEW").stock(1).build();
        OrderEntity cancelled = OrderEntity.builder().orderId("ORD-MIX-1").checkoutGroupId("CHK-MIX")
                .buyerEmail("authenticated@example.test").status("CANCELLED").paymentStatus("PENDING_COD")
                .items(new java.util.ArrayList<>(List.of(com.kuraliupdates.bazaar.entity.OrderItemEntity.builder()
                        .itemId("I-OLD").product(alreadyRestored).quantity(2).build()))).build();
        OrderEntity active = OrderEntity.builder().orderId("ORD-MIX-2").checkoutGroupId("CHK-MIX")
                .buyerEmail("authenticated@example.test").status("PLACED").paymentStatus("PENDING_COD")
                .items(new java.util.ArrayList<>(List.of(com.kuraliupdates.bazaar.entity.OrderItemEntity.builder()
                        .itemId("I-NEW").product(stillReserved).quantity(3).build()))).build();
        when(orderRepository.findById("ORD-MIX-1")).thenReturn(Optional.of(cancelled));
        when(orderRepository.findLockedByCheckoutGroupId("CHK-MIX")).thenReturn(List.of(cancelled, active));
        when(productRepository.findLockedByProductId("P-NEW")).thenReturn(Optional.of(stillReserved));
        when(orderRepository.saveAll(any(Iterable.class))).thenAnswer(invocation -> invocation.getArgument(0));

        orderService.cancelOrderForBuyer("ORD-MIX-1", buyer());

        assertEquals(3, alreadyRestored.getStock());
        assertEquals(4, stillReserved.getStock());
        assertEquals("CANCELLED", active.getStatus());
        verify(productRepository, never()).findLockedByProductId("P-OLD");
        verify(productRepository).findLockedByProductId("P-NEW");
    }

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
    void appliesServerAcceptedOfferToOrderItemWithoutChangingCataloguePrice() {
        SellerEntity seller = seller();
        ProductEntity product = ProductEntity.builder().productId("P-1").seller(seller)
                .title("Synthetic Test Product").sellerPrice(new BigDecimal("20.00"))
                .additionalDiscountPercent(BigDecimal.ZERO).stock(5).build();
        when(productRepository.findLockedByProductId("P-1")).thenReturn(Optional.of(product));
        when(sellerRepository.findById("SELLER-1")).thenReturn(Optional.of(seller));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jdbc.query(
                contains("SELECT m.OFFER_PRICE"),
                ArgumentMatchers.<ResultSetExtractor<BigDecimal>>any(),
                any(Object[].class)
        )).thenReturn(new BigDecimal("15.00"));

        var result = orderService.placeOrder(request("COD", List.of(
                new OrderItemRequest("P-1", 1, new BigDecimal("15.00"), "msg-accepted")
        )), buyer());

        assertEquals(new BigDecimal("15.00"), result.order().subtotal());
        assertEquals(new BigDecimal("15.00"), result.order().items().get(0).unitPrice());
        assertEquals(new BigDecimal("20.00"), product.getSellerPrice());
        assertEquals(4, product.getStock());
        verify(orderRepository).save(any(OrderEntity.class));
    }

    @Test
    void rejectsMissingProductWithoutPersistingOrder() {
        when(productRepository.findLockedByProductId("missing")).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> orderService.placeOrder(request("COD", List.of(new OrderItemRequest("missing", 1, null))), buyer()));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void buyerCanConfirmReadyStorePickupWithOwnOtp() {
        OrderEntity order = OrderEntity.builder()
                .orderId("PICKUP-ORDER-1")
                .buyerEmail("authenticated@example.test")
                .fulfilmentMode("STORE_PICKUP")
                .status("READY_FOR_PICKUP")
                .paymentMethod("COD")
                .paymentStatus("PENDING_COD")
                .deliveryOtp("0042")
                .build();
        when(orderRepository.findLockedByOrderId("PICKUP-ORDER-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = orderService.confirmStorePickup("PICKUP-ORDER-1", "0042", buyer());

        assertEquals("DELIVERED", order.getStatus());
        assertEquals("PICKED_UP_BY_BUYER", order.getFulfilmentStatus());
        assertEquals("PAID", order.getPaymentStatus());
        assertEquals("STORE_PICKUP", response.fulfilmentMode());
        verify(orderRepository).save(order);
    }

    @Test
    void buyerCannotConfirmStorePickupForAnotherBuyer() {
        OrderEntity order = OrderEntity.builder()
                .orderId("PICKUP-ORDER-2")
                .buyerEmail("owner@example.test")
                .fulfilmentMode("STORE_PICKUP")
                .status("READY_FOR_PICKUP")
                .deliveryOtp("0042")
                .build();
        when(orderRepository.findLockedByOrderId("PICKUP-ORDER-2")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> orderService.confirmStorePickup("PICKUP-ORDER-2", "0042", buyer()));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void allowsBuyerToTrackOnlyTheirOwnOrder() {
        OrderEntity order = OrderEntity.builder()
                .orderId("ORDER-1")
                .buyerEmail("authenticated@example.test")
                .build();
        when(orderRepository.findById("ORDER-1")).thenReturn(Optional.of(order));

        var result = orderService.trackForBuyer("ORDER-1", buyer());

        assertEquals("ORDER-1", result.orderId());
    }

    @Test
    void hidesAnotherBuyersOrderFromTheRequester() {
        OrderEntity order = OrderEntity.builder()
                .orderId("ORDER-1")
                .buyerEmail("owner@example.test")
                .build();
        when(orderRepository.findById("ORDER-1")).thenReturn(Optional.of(order));
        UserEntity otherBuyer = UserEntity.builder()
                .userId("USER-2").email("other@example.test").role("BUYER").build();

        ApiException error = assertThrows(ApiException.class,
                () -> orderService.trackForBuyer("ORDER-1", otherBuyer));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
    }

    @Test
    void multiProfileAccountCanTrackOwnOrderWhenPrimaryRoleIsNotBuyer() {
        OrderEntity order = OrderEntity.builder()
                .orderId("ORDER-1")
                .buyerEmail("authenticated@example.test")
                .build();
        when(orderRepository.findById("ORDER-1")).thenReturn(Optional.of(order));
        UserEntity adminPrimary = UserEntity.builder()
                .userId("USER-1").email("authenticated@example.test").role("ADMIN").build();

        var result = orderService.trackForBuyer("ORDER-1", adminPrimary);

        assertEquals("ORDER-1", result.orderId());
    }

    @Test
    void aggregatesDuplicateCartLinesBeforeCheckingAvailableStock() {
        SellerEntity seller = seller();
        ProductEntity product = ProductEntity.builder().productId("P-1").seller(seller)
                .title("Synthetic Test Product").sellerPrice(BigDecimal.valueOf(20))
                .additionalDiscountPercent(BigDecimal.ZERO).stock(3).build();
        when(productRepository.findLockedByProductId("P-1")).thenReturn(Optional.of(product));

        ApiException error = assertThrows(ApiException.class,
                () -> orderService.placeOrder(request("COD", List.of(
                        new OrderItemRequest("P-1", 2, null),
                        new OrderItemRequest("P-1", 2, null))), buyer()));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals(3, product.getStock());
        verify(productRepository, times(1)).findLockedByProductId("P-1");
        verify(orderRepository, never()).save(any());
    }

    @Test
    void aggregatesDuplicateCartLinesIntoOneReservedOrderItem() {
        SellerEntity seller = seller();
        ProductEntity product = ProductEntity.builder().productId("P-1").seller(seller)
                .title("Synthetic Test Product").sellerPrice(BigDecimal.valueOf(20))
                .additionalDiscountPercent(BigDecimal.ZERO).stock(5).build();
        when(productRepository.findLockedByProductId("P-1")).thenReturn(Optional.of(product));
        when(sellerRepository.findById("SELLER-1")).thenReturn(Optional.of(seller));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = orderService.placeOrder(request("COD", List.of(
                new OrderItemRequest("P-1", 2, null),
                new OrderItemRequest("P-1", 1, null))), buyer());

        assertEquals(2, product.getStock());
        assertEquals(1, result.order().items().size());
        assertEquals(3, result.order().items().get(0).quantity());
        assertEquals(new BigDecimal("60.00"), result.order().subtotal());
        verify(productRepository, times(1)).findLockedByProductId("P-1");
        verify(orderRepository).save(any(OrderEntity.class));
    }

    private UserEntity buyer() {
        return UserEntity.builder().userId("USER-1").name("Authenticated Buyer")
                .email("authenticated@example.test").phone("9876543210").role("ADMIN").build();
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

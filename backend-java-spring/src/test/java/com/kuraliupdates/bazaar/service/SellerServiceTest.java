package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.BillDiscountEntity;
import com.kuraliupdates.bazaar.dto.seller.SellerProductRequest;
import com.kuraliupdates.bazaar.dto.order.OrderResponse;
import com.kuraliupdates.bazaar.entity.OrderItemEntity;
import com.kuraliupdates.bazaar.entity.ProductEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.BillDiscountRepository;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
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
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse updated = sellerService.updateOrderStatus(TOKEN, "ORD-1", "accepted_by_seller");

        assertEquals("ACCEPTED_BY_SELLER", updated.status());
        assertNotNull(updated.updatedAt());
        verify(orderRepository).save(order);
    }

    @Test
    void sellerCanMarkAcceptedOrderReadyForPickup() {
        SellerEntity seller = approvedSeller("SELLER-1");
        OrderEntity order = order(seller, "ACCEPTED_BY_SELLER");
        stubSeller(seller);
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse updated = sellerService.updateOrderStatus(TOKEN, "ORD-1", "READY_FOR_PICKUP");

        assertEquals("READY_FOR_PICKUP", updated.status());
        verify(orderRepository).save(order);
    }

    @Test
    void sellerCanCancelPlacedOrder() {
        SellerEntity seller = approvedSeller("SELLER-1");
        OrderEntity order = order(seller, "PLACED");
        stubSeller(seller);
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse updated = sellerService.updateOrderStatus(TOKEN, "ORD-1", "CANCELLED");

        assertEquals("CANCELLED", updated.status());
        assertEquals("CANCELLED", order.getFulfilmentStatus());
        assertEquals("PENDING_COD", order.getPaymentStatus());
        verify(orderRepository).save(order);
    }

    @Test
    void cancellingPlacedOrderRestoresReservedInventoryExactlyOnce() {
        SellerEntity seller = approvedSeller("SELLER-1");
        ProductEntity product = ProductEntity.builder().productId("P-1").seller(seller)
                .title("Synthetic Product").stock(3).build();
        OrderItemEntity item = OrderItemEntity.builder().itemId("ITEM-1").product(product)
                .quantity(2).unitPrice(BigDecimal.TEN).totalPrice(BigDecimal.valueOf(20)).build();
        OrderEntity order = order(seller, "PLACED");
        order.setItems(new java.util.ArrayList<>(List.of(item)));
        item.setOrder(order);
        stubSeller(seller);
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));
        when(productRepository.findLockedByProductId("P-1")).thenReturn(Optional.of(product));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderResponse updated = sellerService.updateOrderStatus(TOKEN, "ORD-1", "CANCELLED");
        OrderResponse replay = sellerService.updateOrderStatus(TOKEN, "ORD-1", "CANCELLED");

        assertEquals("CANCELLED", updated.status());
        assertEquals("CANCELLED", replay.status());
        assertEquals(5, product.getStock());
        verify(productRepository, times(1)).findLockedByProductId("P-1");
        verify(orderRepository, times(1)).save(order);
        verify(orderRepository, times(2)).findLockedByOrderId("ORD-1");
        verify(orderRepository, never()).findById("ORD-1");
    }



    @Test
    void paidOrderCannotBeCancelledWithoutRefundWorkflow() {
        SellerEntity seller = approvedSeller("SELLER-1");
        OrderEntity order = order(seller, "PLACED");
        order.setPaymentStatus("PAID");
        stubSeller(seller);
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> sellerService.updateOrderStatus(TOKEN, "ORD-1", "CANCELLED"));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("PLACED", order.getStatus());
        verify(productRepository, never()).findLockedByProductId(anyString());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void cancellationAggregatesRepeatedLinesAndLocksProductsInSortedOrder() {
        SellerEntity seller = approvedSeller("SELLER-1");
        ProductEntity productB = ProductEntity.builder().productId("P-2").seller(seller)
                .title("Product B").stock(1).build();
        ProductEntity productA = ProductEntity.builder().productId("P-1").seller(seller)
                .title("Product A").stock(4).build();
        OrderEntity order = order(seller, "PLACED");
        OrderItemEntity itemB1 = OrderItemEntity.builder().itemId("ITEM-B1").order(order)
                .product(productB).quantity(2).unitPrice(BigDecimal.TEN).totalPrice(BigDecimal.valueOf(20)).build();
        OrderItemEntity itemA = OrderItemEntity.builder().itemId("ITEM-A").order(order)
                .product(productA).quantity(3).unitPrice(BigDecimal.TEN).totalPrice(BigDecimal.valueOf(30)).build();
        OrderItemEntity itemB2 = OrderItemEntity.builder().itemId("ITEM-B2").order(order)
                .product(productB).quantity(1).unitPrice(BigDecimal.TEN).totalPrice(BigDecimal.TEN).build();
        order.setItems(new java.util.ArrayList<>(List.of(itemB1, itemA, itemB2)));
        stubSeller(seller);
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));
        when(productRepository.findLockedByProductId("P-1")).thenReturn(Optional.of(productA));
        when(productRepository.findLockedByProductId("P-2")).thenReturn(Optional.of(productB));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        sellerService.updateOrderStatus(TOKEN, "ORD-1", "CANCELLED");

        assertEquals(7, productA.getStock());
        assertEquals(4, productB.getStock());
        InOrder lockOrder = inOrder(productRepository);
        lockOrder.verify(productRepository).findLockedByProductId("P-1");
        lockOrder.verify(productRepository).findLockedByProductId("P-2");
    }

    @Test
    void missingProductPreventsCancellationAndStockMutation() {
        SellerEntity seller = approvedSeller("SELLER-1");
        ProductEntity product = ProductEntity.builder().productId("P-MISSING").seller(seller)
                .title("Synthetic Product").stock(3).build();
        OrderItemEntity item = OrderItemEntity.builder().itemId("ITEM-MISSING").product(product)
                .quantity(2).unitPrice(BigDecimal.TEN).totalPrice(BigDecimal.valueOf(20)).build();
        OrderEntity order = order(seller, "PLACED");
        order.setItems(new java.util.ArrayList<>(List.of(item)));
        stubSeller(seller);
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));
        when(productRepository.findLockedByProductId("P-MISSING")).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> sellerService.updateOrderStatus(TOKEN, "ORD-1", "CANCELLED"));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("PLACED", order.getStatus());
        assertEquals(3, product.getStock());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void sellerCannotSkipAcceptanceAndMarkPlacedOrderReadyForPickup() {
        SellerEntity seller = approvedSeller("SELLER-1");
        OrderEntity order = order(seller, "PLACED");
        stubSeller(seller);
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));

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
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));

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
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));

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
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> sellerService.updateOrderStatus(TOKEN, "ORD-1", "DELIVERED"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void sellerProductListIsScopedToAuthenticatedStore() {
        SellerEntity seller = approvedSeller("SELLER-1");
        ProductEntity ownProduct = ProductEntity.builder().productId("P-OWN").seller(seller)
                .title("Own product").category("GROCERY").stock(2).build();
        stubSeller(seller);
        when(productRepository.findBySeller_SellerId("SELLER-1")).thenReturn(List.of(ownProduct));

        var products = sellerService.getProducts(TOKEN);

        assertEquals(1, products.size());
        assertEquals("P-OWN", products.get(0).productId());
        assertEquals("SELLER-1", products.get(0).sellerId());
        verify(productRepository).findBySeller_SellerId("SELLER-1");
        verify(productRepository, never()).findAll();
    }

    @Test
    void sellerDiscountListIsScopedToAuthenticatedStore() {
        SellerEntity seller = approvedSeller("SELLER-1");
        BillDiscountEntity ownRule = BillDiscountEntity.builder().ruleId("DISC-OWN")
                .seller(seller).minBillAmount(BigDecimal.valueOf(100))
                .discountPercentage(BigDecimal.valueOf(10)).description("Own store offer").build();
        stubSeller(seller);
        when(billDiscountRepository.findBySeller_SellerIdOrderByMinBillAmountAsc("SELLER-1"))
                .thenReturn(List.of(ownRule));

        var discounts = sellerService.getDiscounts(TOKEN);

        assertEquals(1, discounts.size());
        assertEquals("DISC-OWN", discounts.get(0).getRuleId());
        verify(billDiscountRepository).findBySeller_SellerIdOrderByMinBillAmountAsc("SELLER-1");
        verify(billDiscountRepository, never()).findAll();
    }

    @Test
    void sellerOrderListIsScopedToAuthenticatedStore() {
        SellerEntity seller = approvedSeller("SELLER-1");
        List<OrderEntity> expected = List.of(order(seller, "PLACED"));
        stubSeller(seller);
        when(orderRepository.findBySeller_SellerId("SELLER-1")).thenReturn(expected);

        List<OrderResponse> actual = sellerService.getOrders(TOKEN);
        assertEquals(1, actual.size());
        assertEquals("ORD-1", actual.get(0).orderId());
        assertEquals("PLACED", actual.get(0).status());
        verify(orderRepository).findBySeller_SellerId("SELLER-1");
        verify(orderRepository, never()).findAll();
    }

    @Test
    void sellerCannotUpdateAnotherStoresProduct() {
        SellerEntity seller = approvedSeller("SELLER-1");
        SellerEntity otherSeller = approvedSeller("SELLER-2");
        ProductEntity product = ProductEntity.builder().productId("P-OTHER").seller(otherSeller)
                .title("Other store product").category("GROCERY")
                .mrp(BigDecimal.valueOf(100)).sellerPrice(BigDecimal.valueOf(90)).stock(4).build();
        stubSeller(seller);
        when(productRepository.findById("P-OTHER")).thenReturn(Optional.of(product));

        ApiException error = assertThrows(ApiException.class,
                () -> sellerService.updateProduct(TOKEN, "P-OTHER", productRequest()));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals("Other store product", product.getTitle());
        assertEquals(4, product.getStock());
        verify(productRepository, never()).save(any());
    }

    @Test
    void sellerCannotDeleteAnotherStoresProduct() {
        SellerEntity seller = approvedSeller("SELLER-1");
        SellerEntity otherSeller = approvedSeller("SELLER-2");
        ProductEntity product = ProductEntity.builder().productId("P-OTHER").seller(otherSeller)
                .title("Other store product").category("GROCERY")
                .mrp(BigDecimal.valueOf(100)).sellerPrice(BigDecimal.valueOf(90)).stock(4).build();
        stubSeller(seller);
        when(productRepository.findById("P-OTHER")).thenReturn(Optional.of(product));

        ApiException error = assertThrows(ApiException.class,
                () -> sellerService.deleteProduct(TOKEN, "P-OTHER"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(productRepository, never()).delete(any(ProductEntity.class));
    }

    @Test
    void sellerCanUpdateOwnProduct() {
        SellerEntity seller = approvedSeller("SELLER-1");
        ProductEntity product = ProductEntity.builder().productId("P-OWN").seller(seller)
                .title("Old title").category("GROCERY")
                .mrp(BigDecimal.valueOf(100)).sellerPrice(BigDecimal.valueOf(90)).stock(2).build();
        stubSeller(seller);
        when(productRepository.findById("P-OWN")).thenReturn(Optional.of(product));
        when(productRepository.save(any(ProductEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var updated = sellerService.updateProduct(TOKEN, "P-OWN", productRequest());

        assertEquals("Updated product", updated.title());
        assertEquals(7, product.getStock());
        verify(productRepository).save(product);
    }

    @Test
    void sellerCannotDeleteAnotherStoresDiscountRule() {
        SellerEntity seller = approvedSeller("SELLER-1");
        SellerEntity otherSeller = approvedSeller("SELLER-2");
        BillDiscountEntity rule = BillDiscountEntity.builder().ruleId("DISC-OTHER")
                .seller(otherSeller).minBillAmount(BigDecimal.valueOf(100))
                .discountPercentage(BigDecimal.valueOf(10)).description("Other store offer").build();
        stubSeller(seller);
        when(billDiscountRepository.findById("DISC-OTHER")).thenReturn(Optional.of(rule));

        ApiException error = assertThrows(ApiException.class,
                () -> sellerService.deleteDiscount(TOKEN, "DISC-OTHER"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(billDiscountRepository, never()).delete(any(BillDiscountEntity.class));
    }

    private SellerProductRequest productRequest() {
        return new SellerProductRequest("Updated product", "GROCERY", "description", null,
                BigDecimal.valueOf(100), BigDecimal.valueOf(90), BigDecimal.ZERO, 7,
                "1 pc", List.of("test"), false);
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

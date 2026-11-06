package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.order.OrderResponse;
import com.kuraliupdates.bazaar.dto.product.ProductResponse;
import com.kuraliupdates.bazaar.dto.seller.SellerProductRequest;
import com.kuraliupdates.bazaar.dto.seller.SellerDiscountRequest;
import com.kuraliupdates.bazaar.entity.BillDiscountEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.SellerService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SellerControllerAuthorizationTest {
    private static final String AUTHORIZATION = "Bearer seller-session";

    @Mock private SellerRepository sellerRepository;
    @Mock private ProductRepository productRepository;
    @Mock private SellerService sellerService;
    @Mock private AuthService authService;
    @InjectMocks private SellerController controller;

    @Test
    void currentSellerUsesTheBearerSessionToken() {
        SellerEntity seller = mock(SellerEntity.class);
        when(sellerService.getCurrentSeller("seller-session")).thenReturn(seller);

        assertSame(seller, controller.getCurrentSeller(AUTHORIZATION).getBody());
        verify(sellerService).getCurrentSeller("seller-session");
    }

    @Test
    void availabilityMutationUsesTheBearerSessionToken() {
        SellerEntity seller = mock(SellerEntity.class);
        when(sellerService.updateStoreAvailability("seller-session", true)).thenReturn(seller);

        assertSame(seller, controller.updateStoreAvailability(AUTHORIZATION, java.util.Map.of("open", true)).getBody());
        verify(sellerService).updateStoreAvailability("seller-session", true);
    }

    @Test
    void productReadAndCreateUseTheBearerSessionToken() {
        when(sellerService.getProducts("seller-session")).thenReturn(List.of());
        when(sellerService.addProduct(eq("seller-session"), any())).thenReturn(mock(ProductResponse.class));

        assertTrue(controller.getMyProducts(AUTHORIZATION).getBody().isEmpty());
        assertNotNull(controller.addMyProduct(AUTHORIZATION, null).getBody());

        verify(sellerService).getProducts("seller-session");
        verify(sellerService).addProduct("seller-session", null);
    }

    @Test
    void productUpdateAndDeleteUseTheBearerSessionToken() {
        when(sellerService.updateProduct(eq("seller-session"), eq("PRODUCT-1"), any()))
                .thenReturn(mock(ProductResponse.class));

        assertNotNull(controller.updateMyProduct(AUTHORIZATION, "PRODUCT-1", null).getBody());
        controller.deleteMyProduct(AUTHORIZATION, "PRODUCT-1");

        verify(sellerService).updateProduct("seller-session", "PRODUCT-1", null);
        verify(sellerService).deleteProduct("seller-session", "PRODUCT-1");
    }

    @Test
    void orderReadAndStatusMutationUseTheBearerSessionToken() {
        OrderResponse order = mock(OrderResponse.class);
        when(sellerService.getOrders("seller-session")).thenReturn(List.of(order));
        when(sellerService.updateOrderStatus("seller-session", "ORDER-1", "ACCEPTED_BY_SELLER"))
                .thenReturn(order);

        assertEquals(List.of(order), controller.getMyOrders(AUTHORIZATION).getBody());
        assertSame(order, controller.updateMyOrderStatus(
                AUTHORIZATION, "ORDER-1", "ACCEPTED_BY_SELLER").getBody());

        verify(sellerService).getOrders("seller-session");
        verify(sellerService).updateOrderStatus("seller-session", "ORDER-1", "ACCEPTED_BY_SELLER");
    }

    @Test
    void discountReadCreateAndDeleteUseTheBearerSessionToken() {
        BillDiscountEntity discount = mock(BillDiscountEntity.class);
        when(sellerService.getDiscounts("seller-session")).thenReturn(List.of(discount));
        when(sellerService.addDiscount(eq("seller-session"), any())).thenReturn(discount);

        assertEquals(List.of(discount), controller.getMyDiscounts(AUTHORIZATION).getBody());
        assertSame(discount, controller.addMyDiscount(AUTHORIZATION, null).getBody());
        controller.deleteMyDiscount(AUTHORIZATION, "DISCOUNT-1");

        verify(sellerService).getDiscounts("seller-session");
        verify(sellerService).addDiscount("seller-session", null);
        verify(sellerService).deleteDiscount("seller-session", "DISCOUNT-1");
    }

    @Test
    void missingOrMalformedBearerHeaderIsRejectedByTheSessionBackedServiceBeforeMutation() {
        when(sellerService.updateStoreAvailability(null, true))
                .thenThrow(new ApiException(HttpStatus.UNAUTHORIZED, "No active token"));
        when(sellerService.addProduct(eq(null), any()))
                .thenThrow(new ApiException(HttpStatus.UNAUTHORIZED, "No active token"));

        assertThrows(ApiException.class,
                () -> controller.updateStoreAvailability(null, java.util.Map.of("open", true)));
        assertThrows(ApiException.class,
                () -> controller.addMyProduct("Basic not-a-bearer", null));

        verify(sellerService).updateStoreAvailability(null, true);
        verify(sellerService).addProduct(null, null);
        verifyNoMoreInteractions(sellerService);
    }

    @Test
    void legacyRegistrationRemainsGoneAndDoesNotCallSellerService() {
        assertEquals(HttpStatus.GONE, controller.registerSeller().getStatusCode());
        verifyNoInteractions(sellerService, authService, sellerRepository, productRepository);
    }
}

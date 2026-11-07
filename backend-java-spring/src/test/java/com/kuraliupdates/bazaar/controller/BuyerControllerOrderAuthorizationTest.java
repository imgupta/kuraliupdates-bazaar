package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.order.OrderResponse;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.E2eRunTagging;
import com.kuraliupdates.bazaar.service.OrderService;
import com.kuraliupdates.bazaar.service.ProductService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BuyerControllerOrderAuthorizationTest {
    @Mock private ProductService productService;
    @Mock private OrderService orderService;
    @Mock private AuthService authService;
    @Mock private E2eRunTagging e2eRunTagging;
    @InjectMocks private BuyerController controller;

    @Test
    void orderHistoryIsScopedToTheAuthenticatedUsersEmail() {
        UserEntity buyer = buyer("buyer@example.test");
        OrderResponse order = mock(OrderResponse.class);
        when(orderService.history(buyer)).thenReturn(List.of(order));

        var response = controller.myOrders(authentication(buyer));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(List.of(order), response.getBody());
        verify(orderService).history(buyer);
        verifyNoInteractions(productService, authService, e2eRunTagging);
    }

    @Test
    void trackingPassesTheAuthenticatedBuyerToTheOwnerScopedService() {
        UserEntity buyer = buyer("buyer@example.test");
        OrderResponse order = mock(OrderResponse.class);
        when(orderService.trackForBuyer("ORDER-1", buyer)).thenReturn(order);

        var response = controller.trackOrder("ORDER-1", authentication(buyer));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(order, response.getBody());
        verify(orderService).trackForBuyer("ORDER-1", buyer);
    }

    @Test
    void pickupConfirmationPassesTheAuthenticatedBuyerAndSubmittedOtpToTheService() {
        UserEntity buyer = buyer("buyer@example.test");
        OrderResponse order = mock(OrderResponse.class);
        when(orderService.confirmStorePickup("ORDER-1", "0042", buyer)).thenReturn(order);

        var response = controller.confirmStorePickup(
                "ORDER-1", java.util.Map.of("otp", "0042"), authentication(buyer));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertSame(order, response.getBody());
        verify(orderService).confirmStorePickup("ORDER-1", "0042", buyer);
    }

    @Test
    void pickupConfirmationPassesNoOtpWhenPayloadIsMissing() {
        UserEntity buyer = buyer("buyer@example.test");
        when(orderService.confirmStorePickup("ORDER-1", null, buyer))
                .thenThrow(new ApiException(HttpStatus.BAD_REQUEST, "Pickup OTP must be 4 digits"));

        ApiException error = assertThrows(ApiException.class,
                () -> controller.confirmStorePickup("ORDER-1", null, authentication(buyer)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(orderService).confirmStorePickup("ORDER-1", null, buyer);
    }

    @Test
    void buyerSessionCanUseBuyerActionsWhenAccountPrimaryRoleIsSellerOrAdmin() {
        for (String primaryRole : List.of("SELLER", "ADMIN")) {
            UserEntity multiRoleUser = UserEntity.builder().userId("multi-role-user").name("Multi Role")
                    .email("multi-role@example.test").role(primaryRole).build();
            OrderResponse order = mock(OrderResponse.class);
            when(orderService.history(multiRoleUser)).thenReturn(List.of(order));

            var response = controller.myOrders(authentication(multiRoleUser, "ROLE_BUYER"));

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(List.of(order), response.getBody());
        }
    }

    @Test
    void nonBuyerPrincipalIsRejectedBeforeAnyBuyerOrderServiceAccess() {
        UserEntity seller = UserEntity.builder().userId("seller-user").name("Seller")
                .email("seller@example.test").role("SELLER").build();
        Authentication sellerAuthentication = authentication(seller, "ROLE_SELLER");

        assertForbidden(() -> controller.placeOrder(null, null, null, sellerAuthentication));
        assertForbidden(() -> controller.placeMultiSellerOrder(null, null, null, sellerAuthentication));
        assertForbidden(() -> controller.myOrders(sellerAuthentication));
        assertForbidden(() -> controller.trackOrder("ORDER-1", sellerAuthentication));
        assertForbidden(() -> controller.confirmStorePickup(
                "ORDER-1", java.util.Map.of("otp", "0042"), sellerAuthentication));

        verifyNoInteractions(orderService, e2eRunTagging, productService);
    }

    @Test
    void publicProductSearchRemainsAvailableWithoutAuthentication() {
        when(productService.search("milk", 0, 20)).thenReturn(List.of());

        var response = controller.searchProducts("milk", 0, 20);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isEmpty());
        verify(productService).search("milk", 0, 20);
        verifyNoMoreInteractions(productService);
    }

    private void assertForbidden(org.junit.jupiter.api.function.Executable action) {
        ApiException error = assertThrows(ApiException.class, action);
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
    }

    @Test
    void anonymousOrMalformedAuthenticationCannotReadOrMutateBuyerOrders() {
        Authentication malformed = mock(Authentication.class);
        when(malformed.getPrincipal()).thenReturn("not-a-user-principal");

        assertThrows(ApiException.class, () -> controller.myOrders(null));
        assertThrows(ApiException.class, () -> controller.trackOrder("ORDER-1", null));
        assertThrows(ApiException.class,
                () -> controller.confirmStorePickup("ORDER-1", java.util.Map.of("otp", "0042"), malformed));

        verifyNoInteractions(orderService);
    }

    private Authentication authentication(UserEntity user) {
        return authentication(user, "ROLE_BUYER");
    }

    private Authentication authentication(UserEntity user, String authority) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(user);
        doReturn(List.of(new SimpleGrantedAuthority(authority))).when(authentication).getAuthorities();
        return authentication;
    }

    private UserEntity buyer(String email) {
        return UserEntity.builder().userId("buyer-user").name("Buyer")
                .email(email).phone("9876543210").role("BUYER").build();
    }
}

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
        when(orderService.history("buyer@example.test")).thenReturn(List.of(order));

        var response = controller.myOrders(authentication(buyer));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(List.of(order), response.getBody());
        verify(orderService).history("buyer@example.test");
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
    void nonBuyerPrincipalIsPassedToServiceForRoleRejectionAndCannotTrack() {
        UserEntity seller = UserEntity.builder().userId("seller-user").name("Seller")
                .email("seller@example.test").role("SELLER").build();
        when(orderService.trackForBuyer("ORDER-1", seller))
                .thenThrow(new ApiException(HttpStatus.FORBIDDEN, "Only the owning buyer can track this order"));

        ApiException error = assertThrows(ApiException.class,
                () -> controller.trackOrder("ORDER-1", authentication(seller)));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(orderService).trackForBuyer("ORDER-1", seller);
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
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(user);
        return authentication;
    }

    private UserEntity buyer(String email) {
        return UserEntity.builder().userId("buyer-user").name("Buyer")
                .email(email).phone("9876543210").role("BUYER").build();
    }
}

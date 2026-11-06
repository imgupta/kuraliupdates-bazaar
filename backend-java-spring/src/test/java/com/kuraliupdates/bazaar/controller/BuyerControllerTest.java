package com.kuraliupdates.bazaar.controller;

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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BuyerControllerTest {
    @Mock private ProductService productService;
    @Mock private OrderService orderService;
    @Mock private AuthService authService;
    @Mock private E2eRunTagging e2eRunTagging;
    @InjectMocks private BuyerController controller;

    @Test
    void nonBuyerCannotCheckoutConfirmPickupReadHistoryOrTrackOrders() {
        Authentication authentication = authentication(user("SELLER"));

        assertForbidden(() -> controller.placeOrder(null, "run-1", "flow-token", authentication));
        assertForbidden(() -> controller.placeMultiSellerOrder(null, "run-1", "flow-token", authentication));
        assertForbidden(() -> controller.confirmStorePickup("ORD-1", Map.of("otp", "1234"), authentication));
        assertForbidden(() -> controller.myOrders(authentication));
        assertForbidden(() -> controller.trackOrder("ORD-1", authentication));

        verifyNoInteractions(orderService, e2eRunTagging, productService);
    }

    @Test
    void missingOrNonUserPrincipalCannotAccessBuyerOrderActions() {
        assertUnauthorized(() -> controller.myOrders(null));
        Authentication invalidPrincipal = new UsernamePasswordAuthenticationToken("buyer@example.test", "token");
        assertUnauthorized(() -> controller.trackOrder("ORD-1", invalidPrincipal));

        verifyNoInteractions(orderService, e2eRunTagging, productService);
    }

    @Test
    void buyerHistoryPassesAuthenticatedUserToService() {
        UserEntity buyer = user("BUYER");
        when(orderService.history(buyer)).thenReturn(List.of());

        var response = controller.myOrders(authentication(buyer));

        assertTrue(response.getBody().isEmpty());
        verify(orderService).history(buyer);
        verifyNoMoreInteractions(orderService);
    }

    @Test
    void publicProductSearchRemainsAvailableWithoutAuthentication() {
        when(productService.search("milk", 0, 20)).thenReturn(List.of());

        var response = controller.searchProducts("milk", 0, 20);

        assertTrue(response.getBody().isEmpty());
        verify(productService).search("milk", 0, 20);
        verifyNoMoreInteractions(productService);
    }

    private void assertForbidden(org.junit.jupiter.api.function.Executable action) {
        ApiException error = assertThrows(ApiException.class, action);
        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
    }

    private void assertUnauthorized(org.junit.jupiter.api.function.Executable action) {
        ApiException error = assertThrows(ApiException.class, action);
        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
    }

    private Authentication authentication(UserEntity user) {
        return new UsernamePasswordAuthenticationToken(user, "token");
    }

    private UserEntity user(String role) {
        return UserEntity.builder()
                .userId("USER-1")
                .email("authenticated@example.test")
                .phone("9876543210")
                .name("Synthetic Account")
                .role(role)
                .build();
    }
}

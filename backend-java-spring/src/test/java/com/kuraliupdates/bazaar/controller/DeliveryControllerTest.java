package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.DeliveryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeliveryControllerTest {
    @Mock
    private DeliveryService deliveryService;

    @InjectMocks
    private DeliveryController controller;

    @Test
    void unauthenticatedClaimIsRejectedBeforeServiceAccess() {
        ApiException error = assertThrows(ApiException.class,
                () -> controller.claimJob("ORD-1", "AGENT-1", null));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verifyNoInteractions(deliveryService);
    }

    @Test
    void nonUserPrincipalCannotClaimOrVerifyDeliveryOtp() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("rider@example.com", "token");

        ApiException claimError = assertThrows(ApiException.class,
                () -> controller.claimJob("ORD-1", "AGENT-1", authentication));
        ApiException otpError = assertThrows(ApiException.class,
                () -> controller.verifyDeliveryOtp("ORD-1", java.util.Map.of("otp", "1234"), authentication));

        assertEquals(HttpStatus.UNAUTHORIZED, claimError.getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, otpError.getStatus());
        verifyNoInteractions(deliveryService);
    }

    @Test
    void authenticatedPrincipalIsPassedToClaimAndClientAgentIdIsOnlyAServiceInput() {
        UserEntity user = UserEntity.builder()
                .userId("USER-RIDER-1")
                .email("rider@example.com")
                .phone("9876543210")
                .name("Synthetic Rider")
                .role("DELIVERY")
                .build();
        Authentication authentication = new UsernamePasswordAuthenticationToken(user, "token");
        when(deliveryService.claim("ORD-1", "AGENT-OTHER", user))
                .thenReturn(OrderEntity.builder().orderId("ORD-1").build());

        var response = controller.claimJob("ORD-1", "AGENT-OTHER", authentication);

        assertEquals("ORD-1", response.getBody().orderId());
        verify(deliveryService).claim("ORD-1", "AGENT-OTHER", user);
        verifyNoMoreInteractions(deliveryService);
    }

    @Test
    void authenticatedPrincipalIsPassedToCombinedCheckoutClaim() {
        UserEntity user = UserEntity.builder()
                .userId("USER-RIDER-1")
                .email("rider@example.com")
                .phone("9876543210")
                .name("Synthetic Rider")
                .role("DELIVERY")
                .build();
        Authentication authentication = new UsernamePasswordAuthenticationToken(user, "token");
        when(deliveryService.claimCheckoutGroup("CHK-1", "AGENT-1", user))
                .thenReturn(List.of(OrderEntity.builder().orderId("ORD-1").build()));

        var response = controller.claimCheckoutGroup("CHK-1", "AGENT-1", authentication);

        assertEquals(1, response.getBody().size());
        assertEquals("ORD-1", response.getBody().get(0).orderId());
        verify(deliveryService).claimCheckoutGroup("CHK-1", "AGENT-1", user);
        verifyNoMoreInteractions(deliveryService);
    }
}

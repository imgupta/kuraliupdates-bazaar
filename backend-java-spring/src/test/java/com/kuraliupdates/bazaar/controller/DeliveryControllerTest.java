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
import java.util.Map;

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
    void everyProtectedDeliveryEndpointRejectsMissingAuthenticationBeforeServiceAccess() {
        assertUnauthorized(() -> controller.currentAgent(null));
        assertUnauthorized(() -> controller.updateAvailability(Map.of("available", true), null));
        assertUnauthorized(() -> controller.getAvailableJobs(null));
        assertUnauthorized(() -> controller.getMyAssignedJobs(null));
        assertUnauthorized(() -> controller.claimJob("ORD-1", "AGENT-1", null));
        assertUnauthorized(() -> controller.claimCheckoutGroup("CHK-1", "AGENT-1", null));
        assertUnauthorized(() -> controller.confirmSellerPickup("ORD-1", null));
        assertUnauthorized(() -> controller.resendDeliveryOtp("ORD-1", null));
        assertUnauthorized(() -> controller.verifyDeliveryOtp("ORD-1", Map.of("otp", "1234"), null));

        verifyNoInteractions(deliveryService);
    }

    @Test
    void nonUserPrincipalCannotClaimOrVerifyDeliveryOtp() {
        Authentication authentication = new UsernamePasswordAuthenticationToken("rider@example.com", "token");

        ApiException claimError = assertThrows(ApiException.class,
                () -> controller.claimJob("ORD-1", "AGENT-1", authentication));
        ApiException otpError = assertThrows(ApiException.class,
                () -> controller.verifyDeliveryOtp("ORD-1", Map.of("otp", "1234"), authentication));

        assertEquals(HttpStatus.UNAUTHORIZED, claimError.getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, otpError.getStatus());
        verifyNoInteractions(deliveryService);
    }

    @Test
    void authenticatedPrincipalIsPassedToClaimAndClientAgentIdIsOnlyAServiceInput() {
        UserEntity user = rider();
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
        UserEntity user = rider();
        Authentication authentication = new UsernamePasswordAuthenticationToken(user, "token");
        when(deliveryService.claimCheckoutGroup("CHK-1", "AGENT-1", user))
                .thenReturn(List.of(OrderEntity.builder().orderId("ORD-1").build()));

        var response = controller.claimCheckoutGroup("CHK-1", "AGENT-1", authentication);

        assertEquals(1, response.getBody().size());
        assertEquals("ORD-1", response.getBody().get(0).orderId());
        verify(deliveryService).claimCheckoutGroup("CHK-1", "AGENT-1", user);
        verifyNoMoreInteractions(deliveryService);
    }


    @Test
    void malformedUserPrincipalIsRejectedByEveryProtectedDeliveryOperation() {
        Authentication malformed = new UsernamePasswordAuthenticationToken("not-a-user-principal", "token");

        assertUnauthorized(() -> controller.currentAgent(malformed));
        assertUnauthorized(() -> controller.updateAvailability(Map.of("available", true), malformed));
        assertUnauthorized(() -> controller.getAvailableJobs(malformed));
        assertUnauthorized(() -> controller.getMyAssignedJobs(malformed));
        assertUnauthorized(() -> controller.claimJob("ORD-1", "AGENT-1", malformed));
        assertUnauthorized(() -> controller.claimCheckoutGroup("CHK-1", "AGENT-1", malformed));
        assertUnauthorized(() -> controller.confirmSellerPickup("ORD-1", malformed));
        assertUnauthorized(() -> controller.resendDeliveryOtp("ORD-1", malformed));
        assertUnauthorized(() -> controller.verifyDeliveryOtp("ORD-1", Map.of("otp", "1234"), malformed));

        verifyNoInteractions(deliveryService);
    }

    private void assertUnauthorized(org.junit.jupiter.api.function.Executable action) {
        ApiException error = assertThrows(ApiException.class, action);
        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
    }

    private UserEntity rider() {
        return UserEntity.builder()
                .userId("USER-RIDER-1")
                .email("rider@example.com")
                .phone("9876543210")
                .name("Synthetic Rider")
                .role("DELIVERY")
                .build();
    }
}

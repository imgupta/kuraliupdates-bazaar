package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.entity.UserSessionEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import com.kuraliupdates.bazaar.repository.UserSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeliveryTrackingServiceTest {
    @Mock private DeliveryAgentRepository deliveryAgentRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private UserSessionRepository sessionRepository;
    @Mock private UserRepository userRepository;

    private DeliveryTrackingService service;
    private OrderEntity order;

    @BeforeEach
    void setUp() {
        service = new DeliveryTrackingService(
                deliveryAgentRepository, orderRepository, sessionRepository, userRepository);
        order = OrderEntity.builder()
                .orderId("TEST-ORDER-1")
                .buyerEmail("buyer-a@example.test")
                .deliveryOtp("4821")
                .status("READY_FOR_PICKUP")
                .build();
        when(orderRepository.findById("TEST-ORDER-1")).thenReturn(Optional.of(order));
    }

    @Test
    void authenticatedOrderOwnerCanSeeDeliveryOtp() {
        mockActiveSession("session-a", "user-a", "buyer-a@example.test");

        Map<String, Object> response = service.getOrderTracking("TEST-ORDER-1", "session-a");

        assertEquals("4821", response.get("deliveryOtp"));
        assertEquals("TEST-ORDER-1", response.get("orderId"));
    }

    @Test
    void differentAuthenticatedBuyerCannotTrackAnotherBuyersOrderOrSeeOtp() {
        mockActiveSession("session-b", "user-b", "buyer-b@example.test");

        assertThrows(ApiException.class,
                () -> service.getOrderTracking("TEST-ORDER-1", "session-b"));
        verify(orderRepository).findById("TEST-ORDER-1");
    }

    @Test
    void expiredSessionCannotTrackOrderOrSeeOtp() {
        when(sessionRepository.findBySessionToken("expired-session"))
                .thenReturn(Optional.of(UserSessionEntity.builder()
                        .sessionToken("expired-session")
                        .userId("user-a")
                        .expiresAt(LocalDateTime.now().minusMinutes(1))
                        .build()));

        assertThrows(ApiException.class,
                () -> service.getOrderTracking("TEST-ORDER-1", "expired-session"));
        verify(userRepository, never()).findById(anyString());
    }

    @Test
    void missingSessionCannotTrackOrderOrSeeOtp() {
        assertThrows(ApiException.class,
                () -> service.getOrderTracking("TEST-ORDER-1", null));
        verify(sessionRepository, never()).findBySessionToken(anyString());
    }

    private void mockActiveSession(String token, String userId, String email) {
        when(sessionRepository.findBySessionToken(token))
                .thenReturn(Optional.of(UserSessionEntity.builder()
                        .sessionToken(token)
                        .userId(userId)
                        .expiresAt(LocalDateTime.now().plusMinutes(10))
                        .build()));
        when(userRepository.findById(userId))
                .thenReturn(Optional.of(UserEntity.builder().userId(userId).email(email).build()));
    }
}

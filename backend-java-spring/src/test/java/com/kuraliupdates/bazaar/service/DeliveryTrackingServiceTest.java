package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.entity.UserSessionEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import com.kuraliupdates.bazaar.repository.UserSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeliveryTrackingServiceTest {
    @Mock private DeliveryAgentRepository deliveryAgentRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private UserSessionRepository sessionRepository;
    @Mock private UserRepository userRepository;
    @InjectMocks private DeliveryTrackingService trackingService;

    @Test
    void locationUpdateRequiresValidDeliverySession() {
        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.updateLocation("AGENT-1", 30.0, 76.5, null));
        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verify(deliveryAgentRepository, never()).save(any());
    }

    @Test
    void locationUpdateRejectsOutOfRangeCoordinates() {
        when(sessionRepository.findBySessionToken("token")).thenReturn(Optional.of(session("user-1")));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(
                UserEntity.builder().userId("user-1").email("rider@example.com").build()));
        when(deliveryAgentRepository.findById("AGENT-1")).thenReturn(Optional.of(
                DeliveryAgentEntity.builder().agentId("AGENT-1").email("rider@example.com").build()));

        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.updateLocation("AGENT-1", 91.0, 76.5, "token"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(deliveryAgentRepository, never()).save(any());
    }

    @Test
    void orderTrackingRejectsUnrelatedSession() {
        when(orderRepository.findById("ORD-1")).thenReturn(Optional.of(
                OrderEntity.builder().orderId("ORD-1").buyerEmail("buyer@example.com").build()));
        when(sessionRepository.findBySessionToken("token")).thenReturn(Optional.of(session("user-2")));
        when(userRepository.findById("user-2")).thenReturn(Optional.of(
                UserEntity.builder().userId("user-2").email("other@example.com").build()));

        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.getOrderTracking("ORD-1", "token"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
    }

    @Test
    void orderOwnerCanSeeDeliveryOtp() {
        when(orderRepository.findById("ORD-2")).thenReturn(Optional.of(
                OrderEntity.builder().orderId("ORD-2").buyerEmail("buyer@example.com")
                        .deliveryOtp("4821").status("OUT_FOR_DELIVERY").build()));
        when(sessionRepository.findBySessionToken("buyer-token")).thenReturn(Optional.of(session("buyer-id")));
        when(userRepository.findById("buyer-id")).thenReturn(Optional.of(
                UserEntity.builder().userId("buyer-id").email("buyer@example.com").build()));

        var result = trackingService.getOrderTracking("ORD-2", "buyer-token");

        assertEquals("4821", result.get("deliveryOtp"));
    }

    @Test
    void unrelatedUserNeverReceivesDeliveryOtp() {
        when(orderRepository.findById("ORD-3")).thenReturn(Optional.of(
                OrderEntity.builder().orderId("ORD-3").buyerEmail("buyer@example.com")
                        .deliveryOtp("4821").status("OUT_FOR_DELIVERY").build()));
        when(sessionRepository.findBySessionToken("other-token")).thenReturn(Optional.of(session("other-id")));
        when(userRepository.findById("other-id")).thenReturn(Optional.of(
                UserEntity.builder().userId("other-id").email("other@example.com").build()));

        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.getOrderTracking("ORD-3", "other-token"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
    }

    private UserSessionEntity session(String userId) {
        return UserSessionEntity.builder().sessionToken("token-" + userId).userId(userId)
                .expiresAt(LocalDateTime.now().plusMinutes(30)).build();
    }
}

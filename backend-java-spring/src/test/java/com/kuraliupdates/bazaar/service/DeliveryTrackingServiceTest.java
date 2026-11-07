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
                DeliveryAgentEntity.builder().agentId("AGENT-1").email("rider@example.com").status("ACTIVE").build()));

        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.updateLocation("AGENT-1", 91.0, 76.5, "token"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(deliveryAgentRepository, never()).save(any());
    }

    @Test
    void locationUpdateRejectsDeliveryProfileThatIsNotApprovedActive() {
        when(sessionRepository.findBySessionToken("token")).thenReturn(Optional.of(session("user-1")));
        when(deliveryAgentRepository.findById("AGENT-1")).thenReturn(Optional.of(
                DeliveryAgentEntity.builder().agentId("AGENT-1").email("rider@example.com")
                        .status("PENDING").build()));

        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.updateLocation("AGENT-1", 30.0, 76.5, "token"));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
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

    @Test
    void deliveryLocationCannotBeUpdatedThroughAnotherRidersSession() {
        when(sessionRepository.findBySessionToken("token")).thenReturn(Optional.of(session("user-1")));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(
                UserEntity.builder().userId("user-1").email("other-rider@example.com").build()));
        when(deliveryAgentRepository.findById("AGENT-1")).thenReturn(Optional.of(
                DeliveryAgentEntity.builder().agentId("AGENT-1").email("rider@example.com")
                        .status("ACTIVE").build()));

        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.updateLocation("AGENT-1", 30.0, 76.5, "token"));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verify(deliveryAgentRepository, never()).save(any());
    }

    @Test
    void expiredDeliverySessionCannotUpdateLocation() {
        UserSessionEntity expired = session("user-1");
        expired.setExpiresAt(LocalDateTime.now().minusSeconds(1));
        when(sessionRepository.findBySessionToken("expired-token")).thenReturn(Optional.of(expired));

        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.updateLocation("AGENT-1", 30.0, 76.5, "expired-token"));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verify(deliveryAgentRepository, never()).findById(anyString());
        verify(deliveryAgentRepository, never()).save(any());
    }

    @Test
    void assignedRiderCanTrackOwnOrderButDoesNotReceiveBuyerDeliveryOtp() {
        DeliveryAgentEntity assigned = DeliveryAgentEntity.builder()
                .agentId("AGENT-1").userId("rider-id").email("rider@example.com").status("ACTIVE").fullName("Assigned Rider")
                .currentLatitude(new java.math.BigDecimal("30.0"))
                .currentLongitude(new java.math.BigDecimal("76.5")).build();
        OrderEntity order = OrderEntity.builder().orderId("ORD-RIDER-OWN")
                .buyerEmail("buyer@example.com").deliveryOtp("4821")
                .status("OUT_FOR_DELIVERY").deliveryAgent(assigned).build();
        when(orderRepository.findById("ORD-RIDER-OWN")).thenReturn(Optional.of(order));
        when(sessionRepository.findBySessionToken("rider-token")).thenReturn(Optional.of(session("rider-id")));
        when(userRepository.findById("rider-id")).thenReturn(Optional.of(
                UserEntity.builder().userId("rider-id").email("rider@example.com").build()));

        var result = trackingService.getOrderTracking("ORD-RIDER-OWN", "rider-token");

        assertEquals("ORD-RIDER-OWN", result.get("orderId"));
        assertEquals("AGENT-1", result.get("agentId"));
        assertFalse(result.containsKey("deliveryOtp"));
    }

    @Test
    void differentRiderCannotTrackAnOrderAssignedToAnotherRider() {
        DeliveryAgentEntity assigned = DeliveryAgentEntity.builder()
                .agentId("AGENT-1").userId("assigned-rider-id").email("assigned-rider@example.com")
                .status("ACTIVE").build();
        OrderEntity order = OrderEntity.builder().orderId("ORD-RIDER-OTHER")
                .buyerEmail("buyer@example.com").deliveryAgent(assigned).build();
        when(orderRepository.findById("ORD-RIDER-OTHER")).thenReturn(Optional.of(order));
        when(sessionRepository.findBySessionToken("other-rider-token"))
                .thenReturn(Optional.of(session("other-rider-id")));
        when(userRepository.findById("other-rider-id")).thenReturn(Optional.of(
                UserEntity.builder().userId("other-rider-id").email("other-rider@example.com").build()));

        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.getOrderTracking("ORD-RIDER-OTHER", "other-rider-token"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
    }


    @Test
    void linkedRiderCanTrackUsingStableUserIdEvenWhenEmailDiffers() {
        DeliveryAgentEntity assigned = DeliveryAgentEntity.builder()
                .agentId("AGENT-LINKED").userId("rider-id").email("old-rider@example.com")
                .status("ACTIVE").fullName("Linked Rider").build();
        OrderEntity order = OrderEntity.builder().orderId("ORD-LINKED-RIDER")
                .buyerEmail("buyer@example.com").deliveryAgent(assigned).build();
        when(orderRepository.findById("ORD-LINKED-RIDER")).thenReturn(Optional.of(order));
        when(sessionRepository.findBySessionToken("linked-rider-token"))
                .thenReturn(Optional.of(session("rider-id")));
        when(userRepository.findById("rider-id")).thenReturn(Optional.of(
                UserEntity.builder().userId("rider-id").email("new-rider@example.com").build()));

        var result = trackingService.getOrderTracking("ORD-LINKED-RIDER", "linked-rider-token");

        assertEquals("AGENT-LINKED", result.get("agentId"));
    }

    @Test
    void linkedRiderCannotUseMatchingEmailWhenUserIdBelongsToAnotherAccount() {
        DeliveryAgentEntity assigned = DeliveryAgentEntity.builder()
                .agentId("AGENT-LINKED").userId("real-rider-id").email("shared@example.com")
                .status("ACTIVE").build();
        OrderEntity order = OrderEntity.builder().orderId("ORD-LINKED-MISMATCH")
                .buyerEmail("buyer@example.com").deliveryAgent(assigned).build();
        when(orderRepository.findById("ORD-LINKED-MISMATCH")).thenReturn(Optional.of(order));
        when(sessionRepository.findBySessionToken("spoofed-rider-token"))
                .thenReturn(Optional.of(session("attacker-id")));
        when(userRepository.findById("attacker-id")).thenReturn(Optional.of(
                UserEntity.builder().userId("attacker-id").email("shared@example.com").build()));

        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.getOrderTracking("ORD-LINKED-MISMATCH", "spoofed-rider-token"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
    }

    @Test
    void inactiveAssignedRiderCannotReadBuyerAddressOrLiveLocation() {
        DeliveryAgentEntity assigned = DeliveryAgentEntity.builder()
                .agentId("AGENT-INACTIVE").userId("rider-id").email("rider@example.com")
                .status("SUSPENDED").currentLatitude(new java.math.BigDecimal("30.0"))
                .currentLongitude(new java.math.BigDecimal("76.5")).build();
        OrderEntity order = OrderEntity.builder().orderId("ORD-INACTIVE-RIDER")
                .buyerEmail("buyer@example.com").deliveryAddress("Private buyer address")
                .deliveryAgent(assigned).build();
        when(orderRepository.findById("ORD-INACTIVE-RIDER")).thenReturn(Optional.of(order));
        when(sessionRepository.findBySessionToken("inactive-rider-token"))
                .thenReturn(Optional.of(session("rider-id")));
        when(userRepository.findById("rider-id")).thenReturn(Optional.of(
                UserEntity.builder().userId("rider-id").email("rider@example.com").build()));

        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.getOrderTracking("ORD-INACTIVE-RIDER", "inactive-rider-token"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
    }

    @Test
    void linkedRiderCanUpdateLocationWithoutDependingOnMutableEmail() {
        when(sessionRepository.findBySessionToken("linked-token"))
                .thenReturn(Optional.of(session("rider-id")));
        DeliveryAgentEntity agent = DeliveryAgentEntity.builder()
                .agentId("AGENT-LINKED").userId("rider-id").email("old@example.com")
                .status("ACTIVE").build();
        when(deliveryAgentRepository.findById("AGENT-LINKED")).thenReturn(Optional.of(agent));
        when(deliveryAgentRepository.save(any(DeliveryAgentEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = trackingService.updateLocation("AGENT-LINKED", 30.0, 76.5, "linked-token");

        assertEquals(Boolean.TRUE, result.get("stored"));
        verify(userRepository, never()).findById(anyString());
        verify(deliveryAgentRepository).save(agent);
    }

    @Test
    void nullExpirySessionIsRejectedWithoutProfileLookup() {
        UserSessionEntity malformed = session("rider-id");
        malformed.setExpiresAt(null);
        when(sessionRepository.findBySessionToken("malformed-token")).thenReturn(Optional.of(malformed));

        ApiException error = assertThrows(ApiException.class,
                () -> trackingService.updateLocation("AGENT-1", 30.0, 76.5, "malformed-token"));

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatus());
        verifyNoInteractions(deliveryAgentRepository);
    }

    private UserSessionEntity session(String userId) {
        return UserSessionEntity.builder().sessionToken("token-" + userId).userId(userId)
                .expiresAt(LocalDateTime.now().plusMinutes(30)).build();
    }
}

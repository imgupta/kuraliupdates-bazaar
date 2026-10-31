package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.junit.jupiter.api.BeforeEach;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeliveryServiceTest {
    @Mock private DeliveryAgentRepository agentRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private JdbcTemplate jdbc;
    @Mock private GoogleRoutesService googleRoutesService;
    @InjectMocks private DeliveryService deliveryService;

    @BeforeEach
    void configureDefaultRiderPayout() {
        lenient().when(jdbc.queryForObject(anyString(), eq(BigDecimal.class))).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            return sql.contains("RIDER_BASE_PAYOUT") ? new BigDecimal("45") : new BigDecimal("22");
        });
    }

    @Test
    void pendingAgentCannotSeePickupJobs() {
        DeliveryAgentEntity agent = agent("PENDING");
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.availableJobs(user()));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(orderRepository, never()).findByStatus(any());
    }

    @Test
    void activeAgentClaimsOnlyReadyOrderAndClaimChangesStatus() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder().orderId("ORD-1").status("READY_FOR_PICKUP").build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderEntity claimed = deliveryService.claim("ORD-1", "AGENT-1", user());

        assertEquals("ASSIGNED_TO_DELIVERY", claimed.getStatus());
        assertSame(agent, claimed.getDeliveryAgent());
        verify(orderRepository).findLockedByOrderId("ORD-1");
        verify(orderRepository).save(order);
    }

    @Test
    void agentCannotClaimOrderAlreadyClaimedOrNotReady() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder().orderId("ORD-1").status("PICKED_UP").build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.claim("ORD-1", "AGENT-1", user()));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void correctOtpWithLeadingZeroCompletesOrderAndCreditsPayoutOnce() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder()
                .orderId("SYNTH-OTP-VERIFY-1")
                .status("PICKED_UP")
                .deliveryAgent(agent)
                .deliveryOtp("0042")
                .paymentMethod("COD")
                .paymentStatus("PENDING_COD")
                .distanceKm(new BigDecimal("1.5"))
                .riderPayoutSnapshot(new BigDecimal("78.00"))
                .riderPayoutSnapshottedAt(java.time.LocalDateTime.now().minusDays(1))
                .build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedForDeliveryVerification("SYNTH-OTP-VERIFY-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(agentRepository.save(any(DeliveryAgentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = deliveryService.verifyDeliveryOtp("SYNTH-OTP-VERIFY-1", "0042", user());

        assertEquals(Boolean.TRUE, response.get("success"));
        assertEquals("DELIVERED", order.getStatus());
        assertEquals("PAID", order.getPaymentStatus());
        assertEquals(1, agent.getTotalTrips());
        assertEquals(0, new BigDecimal("78").compareTo(agent.getTodayEarnings()));
        assertEquals(0, new BigDecimal("78").compareTo(agent.getTotalEarnings()));
        verify(orderRepository, times(1)).save(order);
        verify(agentRepository, times(1)).save(agent);
    }

    @Test
    void storePickupOrdersAreNeverOfferedAsRiderJobs() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity delivery = OrderEntity.builder().orderId("DELIVERY-1").status("READY_FOR_PICKUP")
                .fulfilmentMode("DELIVERY").build();
        OrderEntity pickup = OrderEntity.builder().orderId("PICKUP-1").status("READY_FOR_PICKUP")
                .fulfilmentMode("STORE_PICKUP").build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findByStatus("READY_FOR_PICKUP")).thenReturn(java.util.List.of(delivery, pickup));

        var jobs = deliveryService.availableJobs(user());

        assertEquals(1, jobs.size());
        assertEquals("DELIVERY-1", jobs.get(0).getOrderId());
    }

    @Test
    void replayedOtpIsRejectedWithoutDoubleCreditingPayout() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder()
                .orderId("SYNTH-OTP-VERIFY-REPLAY")
                .status("DELIVERED")
                .deliveryAgent(agent)
                .deliveryOtp("0042")
                .paymentMethod("COD")
                .paymentStatus("PAID")
                .build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedForDeliveryVerification("SYNTH-OTP-VERIFY-REPLAY")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.verifyDeliveryOtp("SYNTH-OTP-VERIFY-REPLAY", "0042", user()));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals(0, agent.getTotalTrips());
        assertEquals(BigDecimal.ZERO, agent.getTotalEarnings());
        verify(orderRepository, never()).save(any());
        verify(agentRepository, never()).save(any());
    }

    @Test
    void correctOtpCannotCompleteOrderBeforeDeliveryAssignment() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder()
                .orderId("SYNTH-OTP-VERIFY-NOT-ASSIGNED")
                .status("READY_FOR_PICKUP")
                .deliveryAgent(null)
                .deliveryOtp("0042")
                .paymentMethod("COD")
                .paymentStatus("PENDING_COD")
                .build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedForDeliveryVerification("SYNTH-OTP-VERIFY-NOT-ASSIGNED")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.verifyDeliveryOtp("SYNTH-OTP-VERIFY-NOT-ASSIGNED", "0042", user()));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("READY_FOR_PICKUP", order.getStatus());
        assertEquals(0, agent.getTotalTrips());
        verify(orderRepository, never()).save(any());
        verify(agentRepository, never()).save(any());
    }

    @Test
    void malformedOtpIsRejectedBeforeReadingOrder() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.verifyDeliveryOtp("SYNTH-OTP-VERIFY-BAD", "12A4", user()));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(orderRepository, never()).findById(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void assignedActiveAgentRegeneratesFourDigitOtpWithoutReturningIt() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder()
                .orderId("ORD-OTP-1").status("PICKED_UP")
                .deliveryAgent(agent).deliveryOtp("1234").build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("ORD-OTP-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = deliveryService.resendDeliveryOtp("ORD-OTP-1", user());

        assertEquals(Boolean.TRUE, response.get("success"));
        assertFalse(response.toString().contains(order.getDeliveryOtp()));
        assertNotNull(order.getDeliveryOtp());
        assertTrue(order.getDeliveryOtp().matches("\\d{4}"));
        verify(orderRepository).save(order);
    }

    @Test
    void resendOnCombinedDeliveryRotatesOtpForEverySellerOrder() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity first = OrderEntity.builder().orderId("BATCH-1").checkoutGroupId("CHK-1")
                .combinedDeliveryBatchId("CHK-1").status("PICKED_UP")
                .deliveryAgent(agent).deliveryOtp("1111").build();
        OrderEntity second = OrderEntity.builder().orderId("BATCH-2").checkoutGroupId("CHK-1")
                .combinedDeliveryBatchId("CHK-1").status("PICKED_UP")
                .deliveryAgent(agent).deliveryOtp("1111").build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("BATCH-1")).thenReturn(Optional.of(first));
        when(orderRepository.findLockedByCheckoutGroupId("CHK-1")).thenReturn(java.util.List.of(first, second));

        var response = deliveryService.resendDeliveryOtp("BATCH-1", user());

        assertEquals(Boolean.TRUE, response.get("success"));
        assertTrue(first.getDeliveryOtp().matches("\\d{4}"));
        assertEquals(first.getDeliveryOtp(), second.getDeliveryOtp());
        assertNotEquals("1111", first.getDeliveryOtp());
        verify(orderRepository).saveAll(java.util.List.of(first, second));
    }

    @Test
    void resendOtpRejectsOrderAssignedToAnotherAgent() {
        DeliveryAgentEntity authenticatedAgent = agent("ACTIVE");
        DeliveryAgentEntity otherAgent = DeliveryAgentEntity.builder()
                .agentId("AGENT-OTHER").status("ACTIVE").build();
        OrderEntity order = OrderEntity.builder()
                .orderId("ORD-OTP-2").status("PICKED_UP")
                .deliveryAgent(otherAgent).deliveryOtp("1234").build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(authenticatedAgent));
        when(orderRepository.findLockedByOrderId("ORD-OTP-2")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.resendDeliveryOtp("ORD-OTP-2", user()));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void resendOtpRejectsInactiveDeliveryAndDoesNotPersistOtp() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder()
                .orderId("ORD-OTP-3").status("DELIVERED")
                .deliveryAgent(agent).deliveryOtp("1234").build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("ORD-OTP-3")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.resendDeliveryOtp("ORD-OTP-3", user()));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("1234", order.getDeliveryOtp());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void resendOtpEnforcesSixtySecondCooldown() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder()
                .orderId("ORD-OTP-4").status("PICKED_UP")
                .deliveryAgent(agent).deliveryOtp("1234").build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("ORD-OTP-4")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        deliveryService.resendDeliveryOtp("ORD-OTP-4", user());
        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.resendDeliveryOtp("ORD-OTP-4", user()));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
        verify(orderRepository, times(1)).save(order);
    }


    @Test
    void correctOtpForAssignedAgentMarksOrderDeliveredAndCreditsPayout() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder()
                .orderId("SYNTH-OTP-VERIFY-1")
                .status("PICKED_UP")
                .deliveryAgent(agent)
                .deliveryOtp("0042")
                .paymentMethod("COD")
                .paymentStatus("PENDING_COD")
                .distanceKm(new BigDecimal("1.5"))
                .build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedForDeliveryVerification("SYNTH-OTP-VERIFY-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(agentRepository.save(any(DeliveryAgentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = deliveryService.verifyDeliveryOtp("SYNTH-OTP-VERIFY-1", "0042", user());

        assertEquals(Boolean.TRUE, response.get("success"));
        assertEquals("DELIVERED", order.getStatus());
        assertEquals("PAID", order.getPaymentStatus());
        assertEquals(1, agent.getTotalTrips());
        assertEquals(0, new BigDecimal("78").compareTo(agent.getTodayEarnings()));
        assertEquals(0, new BigDecimal("78").compareTo(agent.getTotalEarnings()));
        verify(orderRepository).save(order);
        verify(agentRepository).save(agent);
    }

    @Test
    void sameOtpOnSeparateSellerJobsDoesNotCompleteTheSiblingOrder() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity first = OrderEntity.builder().orderId("SEP-1").checkoutGroupId("CHK-SEP")
                .status("PICKED_UP").deliveryAgent(agent).deliveryOtp("0042")
                .riderPayoutSnapshot(new BigDecimal("67")).build();
        OrderEntity second = OrderEntity.builder().orderId("SEP-2").checkoutGroupId("CHK-SEP")
                .status("PICKED_UP").deliveryAgent(agent).deliveryOtp("0042")
                .riderPayoutSnapshot(new BigDecimal("67")).build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedForDeliveryVerification("SEP-1")).thenReturn(Optional.of(first));
        when(orderRepository.findLockedByCheckoutGroupId("CHK-SEP")).thenReturn(java.util.List.of(first, second));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(agentRepository.save(any(DeliveryAgentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = deliveryService.verifyDeliveryOtp("SEP-1", "0042", user());

        assertEquals(1, response.get("completedOrders"));
        assertEquals("DELIVERED", first.getStatus());
        assertEquals("PICKED_UP", second.getStatus());
        assertEquals(0, new BigDecimal("67").compareTo(agent.getTotalEarnings()));
        verify(orderRepository).save(first);
        verify(orderRepository, never()).saveAll(any());
    }

    @Test
    void combinedBatchOtpCompletesAllSellerOrdersAndCreditsOnePayout() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity first = OrderEntity.builder().orderId("COMB-1").checkoutGroupId("CHK-COMB")
                .combinedDeliveryBatchId("CHK-COMB").status("PICKED_UP")
                .deliveryAgent(agent).deliveryOtp("0042").riderPayoutSnapshot(new BigDecimal("78")).build();
        OrderEntity second = OrderEntity.builder().orderId("COMB-2").checkoutGroupId("CHK-COMB")
                .combinedDeliveryBatchId("CHK-COMB").status("PICKED_UP")
                .deliveryAgent(agent).deliveryOtp("0042").riderPayoutSnapshot(BigDecimal.ZERO).build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedForDeliveryVerification("COMB-2")).thenReturn(Optional.of(second));
        when(orderRepository.findLockedByCheckoutGroupId("CHK-COMB")).thenReturn(java.util.List.of(first, second));
        when(orderRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(agentRepository.save(any(DeliveryAgentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = deliveryService.verifyDeliveryOtp("COMB-2", "0042", user());

        assertEquals(2, response.get("completedOrders"));
        assertEquals("DELIVERED", first.getStatus());
        assertEquals("DELIVERED", second.getStatus());
        assertEquals(0, new BigDecimal("78").compareTo(agent.getTotalEarnings()));
        assertEquals(1, agent.getTotalTrips());
        verify(orderRepository).saveAll(any());
    }

    @Test
    void incorrectOtpDoesNotChangeOrderOrCreditPayout() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder()
                .orderId("SYNTH-OTP-VERIFY-2")
                .status("PICKED_UP")
                .deliveryAgent(agent)
                .deliveryOtp("1234")
                .paymentMethod("COD")
                .paymentStatus("PENDING_COD")
                .distanceKm(new BigDecimal("1.5"))
                .build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedForDeliveryVerification("SYNTH-OTP-VERIFY-2")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.verifyDeliveryOtp("SYNTH-OTP-VERIFY-2", "9999", user()));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals("PICKED_UP", order.getStatus());
        assertEquals(0, agent.getTotalTrips());
        assertEquals(BigDecimal.ZERO, agent.getTotalEarnings());
        verify(orderRepository, never()).save(any());
        verify(agentRepository, never()).save(any());
    }

    @Test
    void correctOtpFromDifferentAgentCannotCompleteOrder() {
        DeliveryAgentEntity authenticatedAgent = agent("ACTIVE");
        DeliveryAgentEntity assignedAgent = DeliveryAgentEntity.builder()
                .agentId("AGENT-OTHER")
                .fullName("Other Rider")
                .email("other-rider@example.com")
                .status("ACTIVE")
                .totalTrips(0)
                .todayEarnings(BigDecimal.ZERO)
                .totalEarnings(BigDecimal.ZERO)
                .build();
        OrderEntity order = OrderEntity.builder()
                .orderId("SYNTH-OTP-VERIFY-3")
                .status("PICKED_UP")
                .deliveryAgent(assignedAgent)
                .deliveryOtp("0042")
                .paymentMethod("COD")
                .paymentStatus("PENDING_COD")
                .build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(authenticatedAgent));
        when(orderRepository.findLockedForDeliveryVerification("SYNTH-OTP-VERIFY-3")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.verifyDeliveryOtp("SYNTH-OTP-VERIFY-3", "0042", user()));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals("PICKED_UP", order.getStatus());
        verify(orderRepository, never()).save(any());
        verify(agentRepository, never()).save(any());
    }

    @Test
    void offlineAgentSeesNoNewPickupJobs() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        agent.setAvailableForJobs(false);
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));

        assertTrue(deliveryService.availableJobs(user()).isEmpty());
        verify(orderRepository, never()).findByStatus(any());
    }

    @Test
    void offlineAgentCannotClaimNewPickupJob() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        agent.setAvailableForJobs(false);
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.claim("ORD-OFFLINE", "AGENT-1", user()));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(orderRepository, never()).findLockedByOrderId(any());
    }

    @Test
    void offlineAgentCanStillCompleteAnAlreadyAssignedDelivery() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        agent.setAvailableForJobs(false);
        OrderEntity order = OrderEntity.builder()
                .orderId("ORD-OFFLINE-ACTIVE")
                .status("PICKED_UP")
                .deliveryAgent(agent)
                .deliveryOtp("0042")
                .paymentMethod("COD")
                .paymentStatus("PENDING_COD")
                .distanceKm(BigDecimal.ONE)
                .build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedForDeliveryVerification("ORD-OFFLINE-ACTIVE")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(agentRepository.save(any(DeliveryAgentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = deliveryService.verifyDeliveryOtp("ORD-OFFLINE-ACTIVE", "0042", user());

        assertEquals(Boolean.TRUE, response.get("success"));
        assertEquals("DELIVERED", order.getStatus());
    }

    @Test
    void combinedDeliveryCannotCompleteUntilEverySellerStopIsCollected() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity collected = OrderEntity.builder().orderId("BATCH-PICKED")
                .checkoutGroupId("CHK-INCOMPLETE").combinedDeliveryBatchId("CHK-INCOMPLETE")
                .status("PICKED_UP").deliveryAgent(agent).deliveryOtp("0042")
                .riderPayoutSnapshot(new BigDecimal("78")).build();
        OrderEntity waiting = OrderEntity.builder().orderId("BATCH-WAITING")
                .checkoutGroupId("CHK-INCOMPLETE").combinedDeliveryBatchId("CHK-INCOMPLETE")
                .status("ASSIGNED_TO_DELIVERY").deliveryAgent(agent).deliveryOtp("0042")
                .riderPayoutSnapshot(BigDecimal.ZERO).build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedForDeliveryVerification("BATCH-PICKED")).thenReturn(Optional.of(collected));
        when(orderRepository.findLockedByCheckoutGroupId("CHK-INCOMPLETE")).thenReturn(java.util.List.of(collected, waiting));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.verifyDeliveryOtp("BATCH-PICKED", "0042", user()));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("PICKED_UP", collected.getStatus());
        assertEquals("ASSIGNED_TO_DELIVERY", waiting.getStatus());
        assertEquals(0, agent.getTotalTrips());
        verify(orderRepository, never()).save(any());
        verify(orderRepository, never()).saveAll(any());
        verify(agentRepository, never()).save(any());
    }

    @Test
    void combinedCheckoutIsNotDispatchableUntilEverySellerIsReady() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity ready = OrderEntity.builder().orderId("READY-1").checkoutGroupId("CHK-READY")
                .status("READY_FOR_PICKUP").fulfilmentMode("DELIVERY").build();
        OrderEntity notReady = OrderEntity.builder().orderId("WAITING-2").checkoutGroupId("CHK-READY")
                .status("ACCEPTED_BY_SELLER").fulfilmentMode("DELIVERY").build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findByStatus("READY_FOR_PICKUP")).thenReturn(java.util.List.of(ready));
        when(orderRepository.findByCheckoutGroupIdOrderByPlacedAtAsc("CHK-READY"))
                .thenReturn(java.util.List.of(ready, notReady));

        assertTrue(deliveryService.availableJobs(user()).isEmpty());
    }

    @Test
    void riderConfirmsEachSellerPickupIndependently() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder().orderId("PICKUP-1")
                .status("ASSIGNED_TO_DELIVERY").deliveryAgent(agent).build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("PICKUP-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderEntity picked = deliveryService.confirmSellerPickup("PICKUP-1", user());

        assertEquals("PICKED_UP", picked.getStatus());
        assertEquals("PICKED_UP_BY_RIDER", picked.getFulfilmentStatus());
        verify(orderRepository).save(order);
    }

    private UserEntity user() {
        return UserEntity.builder().email("rider@example.com").phone("9876543210").name("Rider").role("DELIVERY").build();
    }

    private DeliveryAgentEntity agent(String status) {
        return DeliveryAgentEntity.builder()
                .agentId("AGENT-1").fullName("Rider").email("rider@example.com")
                .phone("9876543210").status(status).totalTrips(0)
                .todayEarnings(BigDecimal.ZERO).totalEarnings(BigDecimal.ZERO)
                .currentLocality("Kurali").build();
    }
}

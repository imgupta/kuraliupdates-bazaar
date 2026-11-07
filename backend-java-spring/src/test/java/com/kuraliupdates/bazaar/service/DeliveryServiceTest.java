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
import static org.mockito.ArgumentMatchers.eq;
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
        lenient().doReturn(1).when(jdbc).update(anyString(), any(Object[].class));
    }


    @Test
    void deliveryProfileLookupUsesStableUserIdBeforeMutableEmail() {
        UserEntity authenticated = UserEntity.builder().userId("rider-user-1")
                .email("changed@example.com").phone("9876543210").role("DELIVERY").build();
        DeliveryAgentEntity linked = DeliveryAgentEntity.builder().agentId("AGENT-1")
                .fullName("Rider").userId("rider-user-1").email("old@example.com")
                .phone("9876543210").status("ACTIVE").build();
        when(agentRepository.findByUserId("rider-user-1")).thenReturn(Optional.of(linked));

        DeliveryAgentEntity result = deliveryService.currentAgent(authenticated);

        assertEquals("AGENT-1", result.getAgentId());
        verify(agentRepository, never()).findByEmail(anyString());
    }

    @Test
    void deliveryProfileWithConflictingUserIdCannotBeClaimedByMatchingEmail() {
        UserEntity authenticated = UserEntity.builder().userId("attacker-user")
                .email("rider@example.com").phone("9876543210").role("DELIVERY").build();
        DeliveryAgentEntity anotherUsersProfile = DeliveryAgentEntity.builder().agentId("AGENT-1")
                .fullName("Rider").userId("victim-user").email("rider@example.com")
                .phone("9876543210").status("ACTIVE").build();
        when(agentRepository.findByUserId("attacker-user")).thenReturn(Optional.empty());
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(anotherUsersProfile));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.currentAgent(authenticated));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(agentRepository, never()).findByEmail(anyString());
        verify(agentRepository, never()).findByPhone(anyString());
    }

    @Test
    void pendingAgentCannotSeePickupJobs() {
        DeliveryAgentEntity agent = agent("PENDING");
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.availableJobs(user()));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(orderRepository, never()).findByStatus(any());
    }

    @Test
    void activeOnlineAgentSeesUnassignedSingleSellerReadyForPickupOrder() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder().orderId("SINGLE-READY-1")
                .status("READY_FOR_PICKUP").fulfilmentMode("DELIVERY").build();
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
        when(orderRepository.findByStatus("READY_FOR_PICKUP")).thenReturn(java.util.List.of(order));

        var jobs = deliveryService.availableJobs(user());

        assertEquals(1, jobs.size());
        assertEquals("SINGLE-READY-1", jobs.get(0).getOrderId());
        verify(orderRepository).findByStatus("READY_FOR_PICKUP");
    }

    @Test
    void activeAgentClaimsOnlyReadyOrderAndClaimChangesStatus() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder().orderId("ORD-1").status("READY_FOR_PICKUP").build();
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));

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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("BATCH-1")).thenReturn(Optional.of(first));
        when(orderRepository.findLockedByCheckoutGroupId("CHK-1")).thenReturn(java.util.List.of(first, second));
        doReturn(1, 0).when(jdbc).update(anyString(), any(Object[].class));

        var response = deliveryService.resendDeliveryOtp("BATCH-1", user());

        assertEquals(Boolean.TRUE, response.get("success"));
        assertTrue(first.getDeliveryOtp().matches("\\d{4}"));
        assertEquals(first.getDeliveryOtp(), second.getDeliveryOtp());
        assertNotEquals("1111", first.getDeliveryOtp());
        DeliveryService secondInstance = new DeliveryService(
                agentRepository, orderRepository, jdbc, googleRoutesService);
        ApiException cooldown = assertThrows(ApiException.class,
                () -> secondInstance.resendDeliveryOtp("BATCH-1", user()));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, cooldown.getStatus());
        verify(orderRepository, times(1)).saveAll(java.util.List.of(first, second));
    }

    @Test
    void resendOtpRejectsOrderAssignedToAnotherAgent() {
        DeliveryAgentEntity authenticatedAgent = agent("ACTIVE");
        DeliveryAgentEntity otherAgent = DeliveryAgentEntity.builder()
                .agentId("AGENT-OTHER").status("ACTIVE").build();
        OrderEntity order = OrderEntity.builder()
                .orderId("ORD-OTP-2").status("PICKED_UP")
                .deliveryAgent(otherAgent).deliveryOtp("1234").build();
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(authenticatedAgent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("ORD-OTP-4")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        doReturn(1, 0).when(jdbc).update(anyString(), any(Object[].class));
        deliveryService.resendDeliveryOtp("ORD-OTP-4", user());
        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.resendDeliveryOtp("ORD-OTP-4", user()));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
        verify(orderRepository, times(1)).save(order);
    }


 
    @Test
    void resendCooldownIsSharedAcrossIndependentDeliveryServiceInstances() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder().orderId("ORD-OTP-MULTI-INSTANCE")
                .status("PICKED_UP").deliveryAgent(agent).deliveryOtp("1234").build();
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("ORD-OTP-MULTI-INSTANCE")).thenReturn(Optional.of(order));
        doReturn(1, 0).when(jdbc).update(anyString(), any(Object[].class));

        deliveryService.resendDeliveryOtp("ORD-OTP-MULTI-INSTANCE", user());
        DeliveryService secondInstance = new DeliveryService(
                agentRepository, orderRepository, jdbc, googleRoutesService);
        ApiException error = assertThrows(ApiException.class,
                () -> secondInstance.resendDeliveryOtp("ORD-OTP-MULTI-INSTANCE", user()));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
        verify(orderRepository, times(1)).save(order);
        verify(jdbc, times(2)).update(anyString(), any(Object[].class));
    }


    @Test
    void resendCooldownRetriesOracleFirstInsertUniqueKeyRace() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder().orderId("ORD-OTP-INSERT-RACE")
                .status("PICKED_UP").deliveryAgent(agent).deliveryOtp("1234").build();
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("ORD-OTP-INSERT-RACE")).thenReturn(Optional.of(order));
        doThrow(new org.springframework.dao.DuplicateKeyException("ORA-00001"))
                .doReturn(1).when(jdbc).update(anyString(), any(Object[].class));

        var response = deliveryService.resendDeliveryOtp("ORD-OTP-INSERT-RACE", user());

        assertEquals(Boolean.TRUE, response.get("success"));
        assertTrue(order.getDeliveryOtp().matches("\\d{4}"));
        verify(jdbc, times(2)).update(anyString(), any(Object[].class));
        verify(orderRepository).save(order);
    }

    @Test
    void resendCooldownFailsClosedWhenDatabaseGuardIsUnavailable() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder().orderId("ORD-OTP-GUARD-DB")
                .status("PICKED_UP").deliveryAgent(agent).deliveryOtp("1234").build();
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("ORD-OTP-GUARD-DB")).thenReturn(Optional.of(order));
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("database unavailable"))
                .when(jdbc).update(anyString(), any(Object[].class));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.resendDeliveryOtp("ORD-OTP-GUARD-DB", user()));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
        assertEquals("1234", order.getDeliveryOtp());
        verify(orderRepository, never()).save(any());
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(authenticatedAgent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));

        assertTrue(deliveryService.availableJobs(user()).isEmpty());
        verify(orderRepository, never()).findByStatus(any());
    }

    @Test
    void offlineAgentCannotClaimNewPickupJob() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        agent.setAvailableForJobs(false);
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));

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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
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
    void singleSellerCheckoutWithCheckoutGroupIdIsDispatchableAsIndividualJob() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder().orderId("SINGLE-CHECKOUT-READY")
                .checkoutGroupId("CHK-SINGLE").status("READY_FOR_PICKUP")
                .fulfilmentMode("DELIVERY").build();
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
        when(orderRepository.findByStatus("READY_FOR_PICKUP")).thenReturn(java.util.List.of(order));
        when(orderRepository.findByCheckoutGroupIdOrderByPlacedAtAsc("CHK-SINGLE"))
                .thenReturn(java.util.List.of(order));

        var jobs = deliveryService.availableJobs(user());

        assertEquals(1, jobs.size());
        assertEquals("SINGLE-CHECKOUT-READY", jobs.get(0).getOrderId());
    }

    @Test
    void combinedCheckoutIsNotDispatchableUntilEverySellerIsReady() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity ready = OrderEntity.builder().orderId("READY-1").checkoutGroupId("CHK-READY")
                .status("READY_FOR_PICKUP").fulfilmentMode("DELIVERY").build();
        OrderEntity notReady = OrderEntity.builder().orderId("WAITING-2").checkoutGroupId("CHK-READY")
                .status("ACCEPTED_BY_SELLER").fulfilmentMode("DELIVERY").build();
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
        when(orderRepository.findByStatus("READY_FOR_PICKUP")).thenReturn(java.util.List.of(ready));
        when(orderRepository.findByCheckoutGroupIdOrderByPlacedAtAsc("CHK-READY"))
                .thenReturn(java.util.List.of(ready, notReady));

        assertTrue(deliveryService.availableJobs(user()).isEmpty());
    }

    @Test
    void combinedCheckoutClaimAssignsEverySellerOrderToAuthenticatedAgentWithSharedOtpAndSinglePayout() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity first = OrderEntity.builder().orderId("GROUP-ORDER-1").checkoutGroupId("CHK-GROUP-1")
                .status("READY_FOR_PICKUP").fulfilmentMode("DELIVERY").build();
        OrderEntity second = OrderEntity.builder().orderId("GROUP-ORDER-2").checkoutGroupId("CHK-GROUP-1")
                .status("READY_FOR_PICKUP").fulfilmentMode("DELIVERY").build();
        java.util.List<OrderEntity> group = java.util.List.of(first, second);
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
        when(jdbc.queryForObject(org.mockito.ArgumentMatchers.contains("BATCH_ENABLED"), eq(Integer.class)))
                .thenReturn(1);
        when(jdbc.queryForObject(org.mockito.ArgumentMatchers.contains("MAX_SELLERS_PER_BATCH"), eq(Integer.class)))
                .thenReturn(3);
        when(jdbc.queryForObject(org.mockito.ArgumentMatchers.contains("MAX_ROUTE_KM"), eq(BigDecimal.class)))
                .thenReturn(new BigDecimal("8"));
        when(orderRepository.findLockedByCheckoutGroupId("CHK-GROUP-1")).thenReturn(group);
        when(googleRoutesService.calculateCombinedRouteKm(group)).thenReturn(new BigDecimal("2.5"));
        when(orderRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var claimed = deliveryService.claimCheckoutGroup("CHK-GROUP-1", "AGENT-1", user());

        assertEquals(2, claimed.size());
        assertTrue(claimed.stream().allMatch(order -> order.getDeliveryAgent() == agent));
        assertTrue(claimed.stream().allMatch(order -> "ASSIGNED_TO_DELIVERY".equals(order.getStatus())));
        assertTrue(claimed.stream().allMatch(order -> "CHK-GROUP-1".equals(order.getCombinedDeliveryBatchId())));
        assertNotNull(first.getDeliveryOtp());
        assertTrue(first.getDeliveryOtp().matches("\\d{4}"));
        assertEquals(first.getDeliveryOtp(), second.getDeliveryOtp());
        assertEquals(0, new BigDecimal("100.00").compareTo(first.getRiderPayoutSnapshot()));
        assertEquals(0, BigDecimal.ZERO.compareTo(second.getRiderPayoutSnapshot()));
        verify(orderRepository).findLockedByCheckoutGroupId("CHK-GROUP-1");
        verify(orderRepository).saveAll(group);
    }

    @Test
    void combinedCheckoutClaimRejectsSpoofedDeliveryAgentBeforeDatabaseOrOrderAccess() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.claimCheckoutGroup("CHK-GROUP-1", "AGENT-OTHER", user()));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(jdbc, orderRepository, googleRoutesService);
    }

    @Test
    void combinedCheckoutClaimRejectsPartiallyReadyGroupWithoutMutatingAnySellerOrder() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity ready = OrderEntity.builder().orderId("GROUP-READY-1").checkoutGroupId("CHK-GROUP-2")
                .status("READY_FOR_PICKUP").fulfilmentMode("DELIVERY").build();
        OrderEntity waiting = OrderEntity.builder().orderId("GROUP-WAITING-2").checkoutGroupId("CHK-GROUP-2")
                .status("ACCEPTED_BY_SELLER").fulfilmentMode("DELIVERY").build();
        java.util.List<OrderEntity> group = java.util.List.of(ready, waiting);
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
        when(jdbc.queryForObject(org.mockito.ArgumentMatchers.contains("BATCH_ENABLED"), eq(Integer.class)))
                .thenReturn(1);
        when(orderRepository.findLockedByCheckoutGroupId("CHK-GROUP-2")).thenReturn(group);

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.claimCheckoutGroup("CHK-GROUP-2", "AGENT-1", user()));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("READY_FOR_PICKUP", ready.getStatus());
        assertEquals("ACCEPTED_BY_SELLER", waiting.getStatus());
        assertNull(ready.getDeliveryAgent());
        assertNull(waiting.getDeliveryAgent());
        verify(orderRepository, never()).saveAll(any());
        verify(googleRoutesService, never()).calculateCombinedRouteKm(any());
    }

    @Test
    void riderConfirmsEachSellerPickupIndependently() {
        DeliveryAgentEntity agent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder().orderId("PICKUP-1")
                .status("ASSIGNED_TO_DELIVERY").deliveryAgent(agent).build();
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("PICKUP-1")).thenReturn(Optional.of(order));
        when(orderRepository.save(any(OrderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderEntity picked = deliveryService.confirmSellerPickup("PICKUP-1", user());

        assertEquals("PICKED_UP", picked.getStatus());
        assertEquals("PICKED_UP_BY_RIDER", picked.getFulfilmentStatus());
        verify(orderRepository).save(order);
    }

    @Test
    void authenticatedAgentCannotClaimUsingAnotherAgentsProfileId() {
        DeliveryAgentEntity authenticatedAgent = agent("ACTIVE");
        OrderEntity order = OrderEntity.builder().orderId("CLAIM-SPOOF-1")
                .status("READY_FOR_PICKUP").fulfilmentMode("DELIVERY").build();
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(authenticatedAgent));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.claim("CLAIM-SPOOF-1", "AGENT-OTHER", user()));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals("READY_FOR_PICKUP", order.getStatus());
        verify(orderRepository, never()).findLockedByOrderId(any());
        verify(orderRepository, never()).save(any());
    }

    @Test
    void authenticatedAgentCannotConfirmPickupAssignedToAnotherAgent() {
        DeliveryAgentEntity authenticatedAgent = agent("ACTIVE");
        DeliveryAgentEntity assignedAgent = DeliveryAgentEntity.builder()
                .agentId("AGENT-OTHER").status("ACTIVE").build();
        OrderEntity order = OrderEntity.builder().orderId("PICKUP-OTHER-AGENT")
                .status("ASSIGNED_TO_DELIVERY").deliveryAgent(assignedAgent).build();
        when(agentRepository.findByUserId("rider-user")).thenReturn(Optional.of(authenticatedAgent));
        when(orderRepository.findLockedByOrderId("PICKUP-OTHER-AGENT")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.confirmSellerPickup("PICKUP-OTHER-AGENT", user()));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals("ASSIGNED_TO_DELIVERY", order.getStatus());
        assertNull(order.getFulfilmentStatus());
        verify(orderRepository, never()).save(any());
    }

    private UserEntity user() {
        return UserEntity.builder().userId("rider-user").email("rider@example.com").phone("9876543210").name("Rider").role("DELIVERY").build();
    }

    private DeliveryAgentEntity agent(String status) {
        return DeliveryAgentEntity.builder()
                .agentId("AGENT-1").userId("rider-user").fullName("Rider").email("rider@example.com")
                .phone("9876543210").status(status).totalTrips(0)
                .todayEarnings(BigDecimal.ZERO).totalEarnings(BigDecimal.ZERO)
                .currentLocality("Kurali").build();
    }
}

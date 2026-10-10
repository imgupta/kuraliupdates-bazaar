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

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeliveryServiceTest {
    @Mock private DeliveryAgentRepository agentRepository;
    @Mock private OrderRepository orderRepository;
    @InjectMocks private DeliveryService deliveryService;

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
        OrderEntity order = OrderEntity.builder().orderId("ORD-1").status("ASSIGNED_TO_DELIVERY").build();
        when(agentRepository.findByEmail("rider@example.com")).thenReturn(Optional.of(agent));
        when(orderRepository.findLockedByOrderId("ORD-1")).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class,
                () -> deliveryService.claim("ORD-1", "AGENT-1", user()));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(orderRepository, never()).save(any());
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

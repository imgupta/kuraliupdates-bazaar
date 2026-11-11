package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
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
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeliveryControllerRoleTest {
    @Mock private DeliveryService deliveryService;
    @InjectMocks private DeliveryController controller;

    @Test
    void buyerScopedSessionCannotCallDeliveryPortalEvenWhenAccountHasDeliveryProfile() {
        UserEntity sameMultiRoleAccount = UserEntity.builder().userId("user-1").role("BUYER").build();
        var buyerSession = new UsernamePasswordAuthenticationToken(sameMultiRoleAccount, "token",
                List.of(new SimpleGrantedAuthority("ROLE_BUYER")));

        ApiException error = assertThrows(ApiException.class, () -> controller.getMyAssignedJobs(buyerSession));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(deliveryService);
    }

    @Test
    void deliveryScopedSessionCanCallDeliveryPortal() {
        UserEntity account = UserEntity.builder().userId("user-1").role("BUYER").build();
        var deliverySession = new UsernamePasswordAuthenticationToken(account, "token",
                List.of(new SimpleGrantedAuthority("ROLE_DELIVERY")));
        DeliveryAgentEntity agent = DeliveryAgentEntity.builder().agentId("agent-1").build();
        when(deliveryService.currentAgent(account)).thenReturn(agent);

        assertEquals(agent, controller.currentAgent(deliverySession).getBody());
        verify(deliveryService).currentAgent(account);
    }
}

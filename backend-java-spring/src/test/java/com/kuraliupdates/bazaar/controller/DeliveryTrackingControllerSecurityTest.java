package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.config.SecurityConfig;
import com.kuraliupdates.bazaar.config.SessionAuthenticationFilter;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.DeliveryTrackingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = DeliveryTrackingController.class)
@Import({SecurityConfig.class, SessionAuthenticationFilter.class})
class DeliveryTrackingControllerSecurityTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private AuthService authService;
    @MockBean private DeliveryTrackingService trackingService;

    @Test
    void anonymousCannotReadOrderTrackingOrUpdateDeliveryLocation() throws Exception {
        mockMvc.perform(get("/tracking/orders/ORDER-1"))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(post("/tracking/delivery/AGENT-1/location")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"latitude\":30.7,\"longitude\":76.7}"))
                .andExpect(status().is4xxClientError());

        verifyNoInteractions(trackingService);
    }

    @Test
    void authenticatedSessionTokenIsForwardedToOrderTrackingOwnershipCheck() throws Exception {
        when(authService.requireUser("buyer-session")).thenReturn(user("buyer-1", "BUYER"));
        when(trackingService.getOrderTracking("ORDER-1", "buyer-session"))
                .thenReturn(Map.of("success", true, "orderId", "ORDER-1", "status", "OUT_FOR_DELIVERY"));

        mockMvc.perform(get("/tracking/orders/ORDER-1")
                .header(HttpHeaders.AUTHORIZATION, "Bearer buyer-session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value("ORDER-1"));

        verify(authService).requireUser("buyer-session");
        verify(trackingService).getOrderTracking("ORDER-1", "buyer-session");
        verifyNoMoreInteractions(trackingService);
    }

    @Test
    void authenticatedSessionTokenIsForwardedForDeliveryLocationOwnershipCheck() throws Exception {
        when(authService.requireUser("rider-session")).thenReturn(user("rider-1", "DELIVERY"));
        when(trackingService.updateLocation("AGENT-1", 30.7, 76.7, "rider-session"))
                .thenReturn(Map.of("success", true, "agentId", "AGENT-1", "stored", true));

        mockMvc.perform(post("/tracking/delivery/AGENT-1/location")
                .header(HttpHeaders.AUTHORIZATION, "Bearer rider-session")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"latitude\":30.7,\"longitude\":76.7}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agentId").value("AGENT-1"));

        verify(authService).requireUser("rider-session");
        verify(trackingService).updateLocation("AGENT-1", 30.7, 76.7, "rider-session");
        verifyNoMoreInteractions(trackingService);
    }

    private UserEntity user(String id, String role) {
        return UserEntity.builder().userId(id).email(id + "@example.test")
                .name(id).role(role).build();
    }
}

package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.auth.UserResponse;
import com.kuraliupdates.bazaar.entity.PortalHandoffEntity;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.BuyerAddressService;
import com.kuraliupdates.bazaar.service.PortalHandoffService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerPortalHandoffTest {

    @Mock private AuthService authService;
    @Mock private BuyerAddressService addressService;
    @Mock private PortalHandoffService handoffService;

    private AuthController controller() {
        return new AuthController(authService, addressService, handoffService);
    }

    @Test
    void createsHandoffOnlyForRegisteredRole() {
        when(authService.registeredRoles("active-session")).thenReturn(List.of("BUYER", "SELLER"));
        when(handoffService.create("active-session", "SELLER")).thenReturn("a".repeat(64));

        ResponseEntity<Map<String, Object>> response = controller().createPortalHandoff(
                "Bearer active-session", Map.of("role", "SELLER"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("a".repeat(64), response.getBody().get("code"));
        assertEquals(60L, response.getBody().get("expiresInSeconds"));
        verify(handoffService).create("active-session", "SELLER");
    }

    @Test
    void rejectsUnregisteredTargetRoleBeforeCreatingHandoff() {
        when(authService.registeredRoles("active-session")).thenReturn(List.of("BUYER"));

        assertThrows(RuntimeException.class, () -> controller().createPortalHandoff(
                "Bearer active-session", Map.of("role", "ADMIN")));

        verifyNoInteractions(handoffService);
    }

    @Test
    void redeemsHandoffAndRevalidatesSessionRole() {
        PortalHandoffEntity stored = PortalHandoffEntity.builder()
                .codeHash("b".repeat(64))
                .sessionToken("active-session")
                .role("SELLER")
                .createdAt(LocalDateTime.now().minusSeconds(5))
                .expiresAt(LocalDateTime.now().plusSeconds(55))
                .build();
        when(handoffService.consume("b".repeat(64))).thenReturn(Optional.of(stored));
        when(authService.createPortalSession("active-session", "SELLER")).thenReturn("target-session");
        when(authService.registeredRoles("target-session")).thenReturn(List.of("BUYER", "SELLER"));
        UserResponse user = mock(UserResponse.class);
        when(user.addresses()).thenReturn(List.of());
        when(authService.currentUser("target-session")).thenReturn(user);

        ResponseEntity<Map<String, Object>> response = controller().redeemPortalHandoff(Map.of("code", "b".repeat(64)));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("target-session", response.getBody().get("token"));
        assertEquals("SELLER", response.getBody().get("role"));
        verify(handoffService).consume("b".repeat(64));
        verify(authService).createPortalSession("active-session", "SELLER");
        verify(authService).registeredRoles("target-session");
    }

    @Test
    void rejectsUnavailableOrReplayedHandoff() {
        when(handoffService.consume("c".repeat(64))).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> controller().redeemPortalHandoff(Map.of("code", "c".repeat(64))));
        verifyNoInteractions(authService);
    }
}

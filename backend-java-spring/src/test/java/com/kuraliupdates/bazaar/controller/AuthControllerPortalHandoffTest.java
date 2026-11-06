package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.auth.UserResponse;
import com.kuraliupdates.bazaar.entity.PortalHandoffEntity;
import com.kuraliupdates.bazaar.repository.PortalHandoffRepository;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.BuyerAddressService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerPortalHandoffTest {

    @Mock private AuthService authService;
    @Mock private BuyerAddressService addressService;
    @Mock private PortalHandoffRepository handoffRepository;

    private AuthController controller() {
        return new AuthController(authService, addressService, handoffRepository);
    }

    @Test
    void createsHighEntropyCodeAndStoresOnlyItsDigest() {
        when(authService.registeredRoles("active-session")).thenReturn(List.of("BUYER", "SELLER"));
        when(handoffRepository.save(any(PortalHandoffEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<Map<String, Object>> response = controller().createPortalHandoff(
                "Bearer active-session", Map.of("role", "SELLER"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        String code = (String) response.getBody().get("code");
        assertNotNull(code);
        assertEquals(64, code.length());
        ArgumentCaptor<PortalHandoffEntity> captor = ArgumentCaptor.forClass(PortalHandoffEntity.class);
        verify(handoffRepository).save(captor.capture());
        PortalHandoffEntity stored = captor.getValue();
        assertNotEquals(code, stored.getCodeHash());
        assertEquals(64, stored.getCodeHash().length());
        assertEquals("active-session", stored.getSessionToken());
        assertEquals("SELLER", stored.getRole());
        assertEquals(60, java.time.Duration.between(stored.getCreatedAt(), stored.getExpiresAt()).getSeconds());
    }

    @Test
    void rejectsReplayOrExpiredCodeWhenAtomicConsumeFails() {
        when(handoffRepository.consume(anyString(), any(LocalDateTime.class))).thenReturn(0);

        var error = assertThrows(RuntimeException.class,
                () -> controller().redeemPortalHandoff(Map.of("code", "a".repeat(64))));

        assertTrue(error.getMessage().contains("expired or was already used"));
        verifyNoInteractions(authService);
        verify(handoffRepository, never()).findById(anyString());
    }

    @Test
    void redeemsCodeOnlyAfterAtomicConsumeAndRevalidatesSessionRole() {
        when(handoffRepository.consume(anyString(), any(LocalDateTime.class))).thenReturn(1);
        PortalHandoffEntity stored = PortalHandoffEntity.builder()
                .codeHash("b".repeat(64))
                .sessionToken("active-session")
                .role("SELLER")
                .createdAt(LocalDateTime.now().minusSeconds(5))
                .expiresAt(LocalDateTime.now().plusSeconds(55))
                .build();
        when(handoffRepository.findById(anyString())).thenReturn(Optional.of(stored));
        when(authService.registeredRoles("active-session")).thenReturn(List.of("BUYER", "SELLER"));
        UserResponse user = mock(UserResponse.class);
        when(user.addresses()).thenReturn(List.of());
        when(authService.currentUser("active-session")).thenReturn(user);

        ResponseEntity<Map<String, Object>> response = controller().redeemPortalHandoff(Map.of("code", "redeem-code"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("active-session", response.getBody().get("token"));
        assertEquals("SELLER", response.getBody().get("role"));
        verify(handoffRepository).consume(anyString(), any(LocalDateTime.class));
        verify(authService).registeredRoles("active-session");
    }
}

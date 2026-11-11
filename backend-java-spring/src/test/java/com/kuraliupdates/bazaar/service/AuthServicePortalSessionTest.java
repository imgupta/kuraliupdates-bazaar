package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.entity.UserSessionEntity;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalRepository;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import com.kuraliupdates.bazaar.repository.UserSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServicePortalSessionTest {
    @Mock private UserRepository users;
    @Mock private UserSessionRepository sessions;
    @Mock private SellerRepository sellers;
    @Mock private DeliveryAgentRepository deliveryAgents;
    @Mock private DailyHelpProfessionalRepository professionals;
    @Mock private OtpService otpService;
    @Mock private BuyerAddressService addressService;
    @Mock private SellerServiceAreaService sellerServiceAreaService;
    @Mock private SellerOnboardingLeadService onboardingLeadService;
    @Mock private SellerRegistrationOtpConfigService registrationOtpConfig;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(users, sessions, sellers, deliveryAgents, professionals,
                otpService, addressService, sellerServiceAreaService, onboardingLeadService,
                registrationOtpConfig);
    }

    @Test
    void portalHandoffCreatesNewSessionBoundToRegisteredRoleAndSourceExpiry() {
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(3);
        UserEntity admin = UserEntity.builder()
                .userId("user-admin")
                .email("admin@kuraliupdates.com")
                .role("ADMIN")
                .accountStatus("ACTIVE")
                .build();
        UserSessionEntity source = UserSessionEntity.builder()
                .sessionToken("source-session")
                .userId(admin.getUserId())
                .expiresAt(expiresAt)
                .e2eRunId("run-123")
                .build();
        when(sessions.findBySessionToken("source-session")).thenReturn(Optional.of(source));
        when(users.findById(admin.getUserId())).thenReturn(Optional.of(admin));

        String targetToken = authService.createPortalSession("source-session", "ADMIN");

        assertNotEquals("source-session", targetToken);
        ArgumentCaptor<UserSessionEntity> saved = ArgumentCaptor.forClass(UserSessionEntity.class);
        verify(sessions).save(saved.capture());
        assertEquals(admin.getUserId(), saved.getValue().getUserId());
        assertEquals("ADMIN", saved.getValue().getActiveRole());
        assertEquals(expiresAt, saved.getValue().getExpiresAt());
        assertEquals("run-123", saved.getValue().getE2eRunId());
    }

    @Test
    void portalHandoffRejectsRoleNotRegisteredToAccount() {
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(3);
        UserEntity buyer = UserEntity.builder()
                .userId("user-buyer")
                .email("buyer@example.test")
                .role("BUYER")
                .accountStatus("ACTIVE")
                .build();
        UserSessionEntity source = UserSessionEntity.builder()
                .sessionToken("source-session")
                .userId(buyer.getUserId())
                .expiresAt(expiresAt)
                .build();
        when(sessions.findBySessionToken("source-session")).thenReturn(Optional.of(source));
        when(users.findById(buyer.getUserId())).thenReturn(Optional.of(buyer));
        when(sellers.findByUserId(buyer.getUserId())).thenReturn(Optional.empty());
        when(deliveryAgents.findByUserId(buyer.getUserId())).thenReturn(Optional.empty());
        when(professionals.findByUserId(buyer.getUserId())).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> authService.createPortalSession("source-session", "SELLER"));
        verify(sessions, never()).save(any(UserSessionEntity.class));
    }
}

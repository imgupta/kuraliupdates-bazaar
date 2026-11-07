package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalEntity;
import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.entity.UserSessionEntity;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalRepository;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import com.kuraliupdates.bazaar.repository.UserSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthRegisteredRolesTest {
    @Mock private UserRepository userRepository;
    @Mock private UserSessionRepository sessionRepository;
    @Mock private SellerRepository sellerRepository;
    @Mock private DeliveryAgentRepository deliveryAgentRepository;
    @Mock private DailyHelpProfessionalRepository dailyHelpProfessionalRepository;
    @Mock private OtpService otpService;
    @Mock private BuyerAddressService addressService;
    @InjectMocks private AuthService authService;

    @Test
    void discoversAllProfilesByStableUserIdEvenWhenLegacyContactValuesDiffer() {
        String userId = "user-multi-role";
        String token = "valid-session";
        UserEntity user = UserEntity.builder()
                .userId(userId)
                .email("Buyer@Example.com")
                .phone("9876543210")
                .role("BUYER")
                .accountStatus("ACTIVE")
                .build();

        when(sessionRepository.findBySessionToken(token)).thenReturn(Optional.of(
                UserSessionEntity.builder().sessionToken(token).userId(userId)
                        .expiresAt(LocalDateTime.now().plusHours(1)).build()));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(sellerRepository.findByUserId(userId)).thenReturn(Optional.of(SellerEntity.builder().sellerId("seller-1").build()));
        when(deliveryAgentRepository.findByUserId(userId)).thenReturn(Optional.of(DeliveryAgentEntity.builder().agentId("agent-1").build()));
        when(dailyHelpProfessionalRepository.findByUserId(userId)).thenReturn(Optional.of(
                DailyHelpProfessionalEntity.builder().professionalId("DHP-1").build()));

        assertEquals(java.util.List.of("BUYER", "SELLER", "DELIVERY", "PROFESSIONAL"),
                authService.registeredRoles(token));
    }


    @Test
    void rootAdminIdentityExposesAllFiveRolesWhenAllProfilesBelongToSameUser() {
        String userId = "shared-five-role-user";
        String token = "five-role-session";
        UserEntity user = UserEntity.builder().userId(userId)
                .email("sg7508359237@gmail.com").phone("9876543210")
                .role("SELLER").isAdmin(0).accountStatus("ACTIVE").build();

        when(sessionRepository.findBySessionToken(token)).thenReturn(Optional.of(
                UserSessionEntity.builder().sessionToken(token).userId(userId)
                        .expiresAt(LocalDateTime.now().plusHours(1)).build()));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(sellerRepository.findByUserId(userId)).thenReturn(Optional.of(SellerEntity.builder().sellerId("seller-five").build()));
        when(deliveryAgentRepository.findByUserId(userId)).thenReturn(Optional.of(DeliveryAgentEntity.builder().agentId("agent-five").build()));
        when(dailyHelpProfessionalRepository.findByUserId(userId)).thenReturn(Optional.of(
                DailyHelpProfessionalEntity.builder().professionalId("professional-five").build()));

        assertEquals(java.util.List.of("BUYER", "SELLER", "DELIVERY", "PROFESSIONAL", "ADMIN"),
                authService.registeredRoles(token));
    }


    @Test
    void deliveryRoleDoesNotFallBackToEmailOrPhoneWhenAnotherUserOwnsTheProfile() {
        String userId = "delivery-attacker-user";
        String token = "delivery-attacker-session";
        UserEntity user = UserEntity.builder().userId(userId).email("shared@example.com")
                .phone("9876543210").role("BUYER").accountStatus("ACTIVE").build();

        when(sessionRepository.findBySessionToken(token)).thenReturn(Optional.of(
                UserSessionEntity.builder().sessionToken(token).userId(userId)
                        .expiresAt(LocalDateTime.now().plusHours(1)).build()));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(sellerRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(sellerRepository.findByEmailIgnoreCase("shared@example.com")).thenReturn(Optional.empty());
        when(sellerRepository.findByPhone("9876543210")).thenReturn(Optional.empty());
        when(deliveryAgentRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(deliveryAgentRepository.findByEmailIgnoreCase("buyer@example.com")).thenReturn(Optional.empty());
        when(dailyHelpProfessionalRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(dailyHelpProfessionalRepository.findByPhone("9876543210")).thenReturn(Optional.empty());

        assertEquals(java.util.List.of("BUYER"), authService.registeredRoles(token));
        verify(deliveryAgentRepository, never()).findByEmailIgnoreCase("shared@example.com");
    }

    @Test
    void legacyUnlinkedDeliveryProfileCanBeDiscoveredByVerifiedAccountEmail() {
        String userId = "legacy-delivery-user";
        String token = "legacy-delivery-session";
        UserEntity user = UserEntity.builder().userId(userId).email("legacy@example.com")
                .phone("9876543210").role("BUYER").accountStatus("ACTIVE").build();

        when(sessionRepository.findBySessionToken(token)).thenReturn(Optional.of(
                UserSessionEntity.builder().sessionToken(token).userId(userId)
                        .expiresAt(LocalDateTime.now().plusHours(1)).build()));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(sellerRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(sellerRepository.findByEmailIgnoreCase("legacy@example.com")).thenReturn(Optional.empty());
        when(sellerRepository.findByPhone("9876543210")).thenReturn(Optional.empty());
        when(deliveryAgentRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(deliveryAgentRepository.findByEmailIgnoreCase("legacy@example.com"))
                .thenReturn(Optional.of(legacyProfile));
        when(dailyHelpProfessionalRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(dailyHelpProfessionalRepository.findByPhone("9876543210")).thenReturn(Optional.empty());

        assertEquals(java.util.List.of("BUYER", "DELIVERY"), authService.registeredRoles(token));
        verify(deliveryAgentRepository).findByEmailIgnoreCase("legacy@example.com");
    }

    @Test
    void issuingAdminScopedE2eSessionDoesNotPromoteOrMutatePrimaryAccountRole() {
        UserEntity user = UserEntity.builder().userId("shared-admin-user")
                .email("sg7508359237@gmail.com").phone("9876543210")
                .role("SELLER").isAdmin(0).accountStatus("ACTIVE").build();
        when(userRepository.findByEmail("sg7508359237@gmail.com")).thenReturn(Optional.of(user));

        authService.createStagingE2eSession("sg7508359237@gmail.com", "ADMIN", "E2E-run-admin");

        assertEquals("SELLER", user.getRole(), "the account primary role must not be changed by issuing a scoped test token");
        assertEquals(0, user.getIsAdmin(), "issuing a scoped ADMIN token must not persistently promote the account");
        org.mockito.ArgumentCaptor<UserSessionEntity> session =
                org.mockito.ArgumentCaptor.forClass(UserSessionEntity.class);
        org.mockito.Mockito.verify(sessionRepository).save(session.capture());
        assertEquals("ADMIN", session.getValue().getActiveRole());
        assertEquals("E2E-run-admin", session.getValue().getE2eRunId());
    }

    @Test
    void doesNotExposeRolesWithoutAnOwnedProfile() {
        String userId = "user-buyer-only";
        String token = "buyer-session";
        UserEntity user = UserEntity.builder().userId(userId).email("buyer@example.com")
                .phone("9876543210").role("BUYER").accountStatus("ACTIVE").build();

        when(sessionRepository.findBySessionToken(token)).thenReturn(Optional.of(
                UserSessionEntity.builder().sessionToken(token).userId(userId)
                        .expiresAt(LocalDateTime.now().plusHours(1)).build()));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(sellerRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(sellerRepository.findByEmailIgnoreCase("buyer@example.com")).thenReturn(Optional.empty());
        when(sellerRepository.findByPhone("9876543210")).thenReturn(Optional.empty());
        when(deliveryAgentRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(dailyHelpProfessionalRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(dailyHelpProfessionalRepository.findByPhone("9876543210")).thenReturn(Optional.empty());

        assertEquals(java.util.List.of("BUYER"), authService.registeredRoles(token));
    }
}

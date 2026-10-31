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
        when(deliveryAgentRepository.findByEmailIgnoreCase("buyer@example.com")).thenReturn(Optional.empty());
        when(deliveryAgentRepository.findByPhone("9876543210")).thenReturn(Optional.empty());
        when(dailyHelpProfessionalRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(dailyHelpProfessionalRepository.findByPhone("9876543210")).thenReturn(Optional.empty());

        assertEquals(java.util.List.of("BUYER"), authService.registeredRoles(token));
    }
}

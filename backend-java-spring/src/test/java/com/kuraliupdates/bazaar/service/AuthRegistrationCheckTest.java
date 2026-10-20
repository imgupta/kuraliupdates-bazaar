package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
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

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthRegistrationCheckTest {
    @Mock private UserRepository userRepository;
    @Mock private UserSessionRepository sessionRepository;
    @Mock private SellerRepository sellerRepository;
    @Mock private DeliveryAgentRepository deliveryAgentRepository;
    @Mock private DailyHelpProfessionalRepository dailyHelpProfessionalRepository;
    @Mock private OtpService otpService;
    @Mock private BuyerAddressService addressService;
    @InjectMocks private AuthService authService;

    @Test
    void stagingE2eBuyerSessionAcceptsAnExistingNonBuyerPrimaryRole() {
        UserEntity existing = UserEntity.builder().userId("user-seller")
                .email("seller@example.com").phone("9876543210").role("SELLER").build();
        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(existing));

        AuthService.AuthResult result = authService.createStagingE2eSession("Seller@Example.com", "BUYER");

        assertTrue(result.token().startsWith("kurali_sess_"));
        assertEquals("user-seller", result.user().userId());
        verify(sessionRepository).save(any());
    }

    @Test
    void stagingE2eDoesNotGrantSellerRoleWithoutSellerProfile() {
        UserEntity existing = UserEntity.builder().userId("user-buyer")
                .email("buyer@example.com").phone("9876543210").role("BUYER").build();
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(existing));
        when(sellerRepository.findByEmailIgnoreCase("buyer@example.com")).thenReturn(Optional.empty());
        when(sellerRepository.findByPhone("9876543210")).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> authService.createStagingE2eSession("buyer@example.com", "SELLER"));

        assertTrue(error.getMessage().contains("not registered for the requested role"));
        verify(sessionRepository, never()).save(any());
    }

    @Test
    void acceptsNewBuyerWhenEmailAndPhoneAreBothAvailable() {
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.empty());
        when(userRepository.findByPhone("9876543210")).thenReturn(Optional.empty());

        var result = authService.registrationCheck("Buyer@Example.com", "9876543210", "BUYER");

        assertEquals(Boolean.TRUE, result.get("success"));
        assertEquals(Boolean.TRUE, result.get("available"));
        assertEquals(Boolean.FALSE, result.get("existingAccount"));
    }

    @Test
    void rejectsEmailAndPhoneThatBelongToDifferentUsers() {
        UserEntity emailOwner = UserEntity.builder().userId("user-email").email("buyer@example.com").role("BUYER").build();
        UserEntity phoneOwner = UserEntity.builder().userId("user-phone").phone("9876543210").role("BUYER").build();
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(emailOwner));
        when(userRepository.findByPhone("9876543210")).thenReturn(Optional.of(phoneOwner));

        ApiException error = assertThrows(ApiException.class,
                () -> authService.registrationCheck("buyer@example.com", "9876543210", "BUYER"));

        assertTrue(error.getMessage().contains("belong to different accounts"));
    }

    @Test
    void permitsAddingRoleWhenBothIdentifiersResolveToSameExistingUser() {
        UserEntity existing = UserEntity.builder().userId("user-existing").email("buyer@example.com")
                .phone("9876543210").role("BUYER").build();
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(existing));
        when(userRepository.findByPhone("9876543210")).thenReturn(Optional.of(existing));
        when(sellerRepository.findByEmailIgnoreCase("buyer@example.com")).thenReturn(Optional.empty());
        when(sellerRepository.findByPhone("9876543210")).thenReturn(Optional.empty());

        var result = authService.registrationCheck("buyer@example.com", "9876543210", "SELLER");

        assertEquals(Boolean.TRUE, result.get("available"));
        assertEquals(Boolean.TRUE, result.get("existingAccount"));
    }

    @Test
    void rejectsSecondBuyerProfileForExistingBuyer() {
        UserEntity existing = UserEntity.builder().userId("user-existing").email("buyer@example.com")
                .phone("9876543210").role("BUYER").build();
        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(existing));
        when(userRepository.findByPhone("9876543210")).thenReturn(Optional.of(existing));

        ApiException error = assertThrows(ApiException.class,
                () -> authService.registrationCheck("buyer@example.com", "9876543210", "BUYER"));

        assertTrue(error.getMessage().contains("already registered for Buyer"));
    }
}

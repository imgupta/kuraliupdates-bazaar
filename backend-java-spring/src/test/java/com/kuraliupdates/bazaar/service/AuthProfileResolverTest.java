package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthProfileResolverTest {
    @Mock private SellerRepository sellerRepository;
    @Mock private DeliveryAgentRepository deliveryAgentRepository;

    @Test
    void linkedSellerProfileTakesPrecedenceOverLegacyContactMatches() {
        UserEntity user = UserEntity.builder()
                .userId("user-1")
                .email("buyer@example.com")
                .phone("9876543210")
                .build();
        SellerEntity linked = SellerEntity.builder().sellerId("seller-linked").build();
        when(sellerRepository.findByUserId("user-1")).thenReturn(Optional.of(linked));

        assertSame(linked, AuthProfileResolver.findSellerProfile(user, sellerRepository).orElseThrow());
        verify(sellerRepository, never()).findByEmailIgnoreCase(anyString());
        verify(sellerRepository, never()).findByPhone(anyString());
    }

    @Test
    void deliveryEmailFallbackIsOnlyAllowedForLegacyUnlinkedProfiles() {
        UserEntity user = UserEntity.builder()
                .userId("user-1")
                .email("rider@example.com")
                .build();
        DeliveryAgentEntity legacy = DeliveryAgentEntity.builder()
                .agentId("agent-legacy")
                .email("rider@example.com")
                .userId(null)
                .build();
        when(deliveryAgentRepository.findByUserId("user-1")).thenReturn(Optional.empty());
        when(deliveryAgentRepository.findByEmailIgnoreCase("rider@example.com")).thenReturn(Optional.of(legacy));

        assertSame(legacy, AuthProfileResolver.findDeliveryProfile(user, deliveryAgentRepository).orElseThrow());
    }

    @Test
    void deliveryProfileDoesNotUseEmailFallbackWhenAccountHasNoStableUserId() {
        UserEntity user = UserEntity.builder().email("rider@example.com").build();

        assertTrue(AuthProfileResolver.findDeliveryProfile(user, deliveryAgentRepository).isEmpty());
        verifyNoInteractions(deliveryAgentRepository);
    }
}

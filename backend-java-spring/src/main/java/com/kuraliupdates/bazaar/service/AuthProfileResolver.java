package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalEntity;
import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalRepository;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Resolves the role-specific profile attached to an authenticated account.
 * USER_ID is authoritative; email/phone fallbacks are retained only for the
 * legacy profile shapes that historically supported them.
 */
@Service
@RequiredArgsConstructor
public class AuthProfileResolver {
    private final SellerRepository sellerRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final DailyHelpProfessionalRepository dailyHelpProfessionalRepository;

    public Optional<SellerEntity> findSellerProfile(UserEntity user) {
        if (user.getUserId() != null) {
            Optional<SellerEntity> linked = sellerRepository.findByUserId(user.getUserId());
            if (linked.isPresent()) return linked;
        }
        if (user.getEmail() != null) {
            Optional<SellerEntity> byEmail = sellerRepository.findByEmailIgnoreCase(user.getEmail());
            if (byEmail.isPresent()) return byEmail;
        }
        return user.getPhone() == null ? Optional.empty() : sellerRepository.findByPhone(user.getPhone());
    }

    public boolean sellerProfileExists(UserEntity user) {
        return findSellerProfile(user).isPresent();
    }

    public Optional<DeliveryAgentEntity> findDeliveryProfile(UserEntity user) {
        if (user.getUserId() == null || user.getUserId().isBlank()) return Optional.empty();
        Optional<DeliveryAgentEntity> linked = deliveryAgentRepository.findByUserId(user.getUserId());
        if (linked.isPresent()) return linked;

        // Email-only fallback is permitted solely for legacy profiles without a
        // USER_ID link. A profile linked to another account never falls back.
        if (user.getEmail() == null) return Optional.empty();
        return deliveryAgentRepository.findByEmailIgnoreCase(user.getEmail())
                .filter(profile -> profile.getUserId() == null || profile.getUserId().isBlank());
    }

    public boolean deliveryProfileExists(UserEntity user) {
        return findDeliveryProfile(user).isPresent();
    }

    public Optional<DailyHelpProfessionalEntity> findProfessionalProfile(UserEntity user) {
        if (user.getUserId() != null) {
            Optional<DailyHelpProfessionalEntity> linked =
                    dailyHelpProfessionalRepository.findByUserId(user.getUserId());
            if (linked.isPresent()) return linked;
        }
        return user.getPhone() == null ? Optional.empty()
                : dailyHelpProfessionalRepository.findByPhone(user.getPhone());
    }

    public boolean professionalProfileExists(UserEntity user) {
        return findProfessionalProfile(user).isPresent();
    }
}

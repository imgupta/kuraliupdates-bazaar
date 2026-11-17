package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalEntity;
import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalRepository;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;

import java.util.Optional;

/**
 * Resolves the role-specific profile attached to an authenticated account.
 * USER_ID is authoritative; email/phone fallbacks are retained only for the
 * legacy profile shapes that historically supported them.
 */
public final class AuthProfileResolver {

    public static Optional<SellerEntity> findSellerProfile(UserEntity user, SellerRepository sellerRepository) {
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

    public static boolean sellerProfileExists(UserEntity user, SellerRepository sellerRepository) {
        return findSellerProfile(user, sellerRepository).isPresent();
    }

    public static Optional<DeliveryAgentEntity> findDeliveryProfile(UserEntity user, DeliveryAgentRepository deliveryAgentRepository) {
        if (user.getUserId() == null || user.getUserId().isBlank()) return Optional.empty();
        Optional<DeliveryAgentEntity> linked = deliveryAgentRepository.findByUserId(user.getUserId());
        if (linked.isPresent()) return linked;

        // Email-only fallback is permitted solely for legacy profiles without a
        // USER_ID link. A profile linked to another account never falls back.
        if (user.getEmail() == null) return Optional.empty();
        return deliveryAgentRepository.findByEmailIgnoreCase(user.getEmail())
                .filter(profile -> profile.getUserId() == null || profile.getUserId().isBlank());
    }

    public static boolean deliveryProfileExists(UserEntity user, DeliveryAgentRepository deliveryAgentRepository) {
        return findDeliveryProfile(user, deliveryAgentRepository).isPresent();
    }

    public static Optional<DailyHelpProfessionalEntity> findProfessionalProfile(UserEntity user, DailyHelpProfessionalRepository dailyHelpProfessionalRepository) {
        if (user.getUserId() != null) {
            Optional<DailyHelpProfessionalEntity> linked =
                    dailyHelpProfessionalRepository.findByUserId(user.getUserId());
            if (linked.isPresent()) return linked;
        }
        return user.getPhone() == null ? Optional.empty()
                : dailyHelpProfessionalRepository.findByPhone(user.getPhone());
    }

    public static boolean professionalProfileExists(UserEntity user, DailyHelpProfessionalRepository dailyHelpProfessionalRepository) {
        return findProfessionalProfile(user, dailyHelpProfessionalRepository).isPresent();
    }
}

package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.UserAddressEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.repository.UserAddressRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class BuyerAddressService {

    private final UserAddressRepository addressRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserAddressEntity> findByUserId(String userId) {
        return addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc(userId);
    }

    public UserAddressEntity create(
            UserEntity user,
            String label,
            String addressLine1,
            String landmark,
            String formattedAddress,
            String placeId,
            Double latitude,
            Double longitude,
            boolean requestedDefault) {

        List<UserAddressEntity> existing = findByUserId(user.getUserId());
        boolean makeDefault = requestedDefault || existing.isEmpty();

        if (makeDefault) {
            clearDefaults(existing);
        }

        UserAddressEntity address = UserAddressEntity.builder()
                .addressId("addr-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(user.getUserId())
                .label(defaultValue(label, "Home"))
                .addressLine1(addressLine1.trim())
                .landmark(trim(landmark))
                .formattedAddress(trim(formattedAddress))
                .placeId(trim(placeId))
                .latitude(toDecimal(latitude))
                .longitude(toDecimal(longitude))
                .isDefault(makeDefault ? 1 : 0)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        UserAddressEntity saved = addressRepository.save(address);
        if (makeDefault) {
            syncPrimaryAddress(user, saved);
        }
        return saved;
    }

    public Optional<UserAddressEntity> update(
            UserEntity user,
            String addressId,
            String label,
            String addressLine1,
            String landmark,
            String formattedAddress,
            String placeId,
            Double latitude,
            Double longitude,
            boolean requestedDefault) {

        Optional<UserAddressEntity> existing = addressRepository.findByAddressIdAndUserId(addressId, user.getUserId());
        if (existing.isEmpty()) {
            return Optional.empty();
        }

        UserAddressEntity address = existing.get();
        address.setLabel(defaultValue(label, address.getLabel()));
        address.setAddressLine1(addressLine1.trim());
        address.setLandmark(trim(landmark));
        address.setFormattedAddress(trim(formattedAddress));
        address.setPlaceId(trim(placeId));
        address.setLatitude(toDecimal(latitude));
        address.setLongitude(toDecimal(longitude));
        address.setUpdatedAt(LocalDateTime.now());

        if (requestedDefault) {
            clearDefaults(findByUserId(user.getUserId()));
            address.setIsDefault(1);
        }

        UserAddressEntity saved = addressRepository.save(address);
        if (saved.getIsDefault() == 1) {
            syncPrimaryAddress(user, saved);
        }
        return Optional.of(saved);
    }

    public Optional<UserAddressEntity> setDefault(UserEntity user, String addressId) {
        Optional<UserAddressEntity> existing =
                addressRepository.findByAddressIdAndUserId(addressId, user.getUserId());

        if (existing.isEmpty()) {
            return Optional.empty();
        }

        clearDefaults(findByUserId(user.getUserId()));
        UserAddressEntity address = existing.get();
        address.setIsDefault(1);
        address.setUpdatedAt(LocalDateTime.now());

        UserAddressEntity saved = addressRepository.save(address);
        syncPrimaryAddress(user, saved);
        return Optional.of(saved);
    }

    private void clearDefaults(List<UserAddressEntity> addresses) {
        LocalDateTime now = LocalDateTime.now();
        addresses.stream()
                .filter(address -> address.getIsDefault() != 0)
                .forEach(address -> {
                    address.setIsDefault(0);
                    address.setUpdatedAt(now);
                    addressRepository.save(address);
                });
    }

    private void syncPrimaryAddress(UserEntity user, UserAddressEntity address) {
        user.setAddress(
                java.util.stream.Stream.of(
                                address.getAddressLine1(),
                                address.getLandmark(),
                                address.getFormattedAddress())
                        .filter(value -> value != null && !value.isBlank())
                        .reduce((left, right) -> left + ", " + right)
                        .orElse(address.getAddressLine1()));

        user.setAddressLine1(address.getAddressLine1());
        user.setLandmark(address.getLandmark());
        user.setFormattedAddress(address.getFormattedAddress());
        user.setPlaceId(address.getPlaceId());
        user.setLatitude(address.getLatitude());
        user.setLongitude(address.getLongitude());
        userRepository.save(user);
    }

    private String defaultValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private BigDecimal toDecimal(Double value) {
        return value == null ? null : BigDecimal.valueOf(value);
    }
}

package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.address.AddressRequest;
import com.kuraliupdates.bazaar.dto.address.AddressResponse;
import com.kuraliupdates.bazaar.entity.UserAddressEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.UserAddressRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
    public List<AddressResponse> findByUserId(String userId) {
        return addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc(userId)
                .stream().map(AddressResponse::from).toList();
    }

    public AddressResponse create(String userId, AddressRequest request) {
        UserEntity user = requireUser(userId);
        List<UserAddressEntity> existing = addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc(userId);
        boolean makeDefault = Boolean.TRUE.equals(request.isDefault()) || existing.isEmpty();

        if (makeDefault) clearDefaults(existing);

        LocalDateTime now = LocalDateTime.now();
        UserAddressEntity address = UserAddressEntity.builder()
                .addressId("addr-" + UUID.randomUUID().toString().substring(0, 8))
                .userId(userId)
                .label(defaultValue(request.label(), "Home"))
                .addressLine1(request.addressLine1().trim())
                .landmark(trim(request.landmark()))
                .formattedAddress(trim(request.formattedAddress()))
                .placeId(trim(request.placeId()))
                .latitude(toDecimal(request.latitude()))
                .longitude(toDecimal(request.longitude()))
                .isDefault(makeDefault ? 1 : 0)
                .createdAt(now).updatedAt(now).build();

        UserAddressEntity saved = addressRepository.save(address);
        if (makeDefault) syncPrimaryAddress(user, saved);
        return AddressResponse.from(saved);
    }

    public Optional<AddressResponse> update(String userId, String addressId, AddressRequest request) {
        UserEntity user = requireUser(userId);
        Optional<UserAddressEntity> existing = addressRepository.findByAddressIdAndUserId(addressId, userId);
        if (existing.isEmpty()) return Optional.empty();

        UserAddressEntity address = existing.get();
        address.setLabel(defaultValue(request.label(), address.getLabel()));
        address.setAddressLine1(request.addressLine1().trim());
        address.setLandmark(trim(request.landmark()));
        address.setFormattedAddress(trim(request.formattedAddress()));
        address.setPlaceId(trim(request.placeId()));
        address.setLatitude(toDecimal(request.latitude()));
        address.setLongitude(toDecimal(request.longitude()));
        address.setUpdatedAt(LocalDateTime.now());

        if (Boolean.TRUE.equals(request.isDefault())) {
            clearDefaults(addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc(userId));
            address.setIsDefault(1);
        }

        UserAddressEntity saved = addressRepository.save(address);
        if (saved.getIsDefault() == 1) syncPrimaryAddress(user, saved);
        return Optional.of(AddressResponse.from(saved));
    }

    public Optional<AddressResponse> setDefault(String userId, String addressId) {
        UserEntity user = requireUser(userId);
        Optional<UserAddressEntity> existing = addressRepository.findByAddressIdAndUserId(addressId, userId);
        if (existing.isEmpty()) return Optional.empty();

        clearDefaults(addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc(userId));
        UserAddressEntity address = existing.get();
        address.setIsDefault(1);
        address.setUpdatedAt(LocalDateTime.now());
        UserAddressEntity saved = addressRepository.save(address);
        syncPrimaryAddress(user, saved);
        return Optional.of(AddressResponse.from(saved));
    }

    private UserEntity requireUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private void clearDefaults(List<UserAddressEntity> addresses) {
        LocalDateTime now = LocalDateTime.now();
        addresses.stream().filter(a -> a.getIsDefault() != 0).forEach(a -> {
            a.setIsDefault(0);
            a.setUpdatedAt(now);
        });
        addressRepository.saveAll(addresses);
    }

    private void syncPrimaryAddress(UserEntity user, UserAddressEntity address) {
        user.setAddress(java.util.stream.Stream.of(
                address.getAddressLine1(), address.getLandmark(), address.getFormattedAddress())
                .filter(v -> v != null && !v.isBlank())
                .reduce((a, b) -> a + ", " + b)
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

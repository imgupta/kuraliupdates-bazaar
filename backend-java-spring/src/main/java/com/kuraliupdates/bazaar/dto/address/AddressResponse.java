package com.kuraliupdates.bazaar.dto.address;

import com.kuraliupdates.bazaar.entity.UserAddressEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AddressResponse(
        String addressId,
        String label,
        String addressLine1,
        String landmark,
        String formattedAddress,
        String placeId,
        BigDecimal latitude,
        BigDecimal longitude,
        Integer isDefault,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AddressResponse from(UserAddressEntity entity) {
        return new AddressResponse(
                entity.getAddressId(), entity.getLabel(), entity.getAddressLine1(),
                entity.getLandmark(), entity.getFormattedAddress(), entity.getPlaceId(),
                entity.getLatitude(), entity.getLongitude(), entity.getIsDefault(),
                entity.getCreatedAt(), entity.getUpdatedAt()
        );
    }
}

package com.kuraliupdates.bazaar.dto.auth;

import com.kuraliupdates.bazaar.dto.address.AddressResponse;
import com.kuraliupdates.bazaar.entity.UserEntity;

import java.math.BigDecimal;
import java.util.List;

public record UserResponse(
        String userId,
        String email,
        String phone,
        String name,
        String role,
        String locality,
        String address,
        String addressLine1,
        String landmark,
        String formattedAddress,
        String placeId,
        BigDecimal latitude,
        BigDecimal longitude,
        Integer isVerified,
        Integer isAdmin,
        String avatarUrl,
        List<AddressResponse> addresses
) {
    public static UserResponse from(UserEntity user, List<AddressResponse> addresses) {
        return new UserResponse(
                user.getUserId(), user.getEmail(), user.getPhone(), user.getName(),
                user.getRole(), user.getLocality(), user.getAddress(), user.getAddressLine1(),
                user.getLandmark(), user.getFormattedAddress(), user.getPlaceId(),
                user.getLatitude(), user.getLongitude(), user.getIsVerified(), user.getIsAdmin(),
                user.getAvatarUrl(), addresses
        );
    }
}

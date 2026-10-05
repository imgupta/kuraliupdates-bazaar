package com.kuraliupdates.bazaar.dto.admin;

import java.time.LocalDateTime;

public record AdminBuyerResponse(
        String userId,
        String name,
        String email,
        String phone,
        String locality,
        String address,
        String formattedAddress,
        Integer isVerified,
        LocalDateTime createdAt,
        LocalDateTime lastLogin
) {}

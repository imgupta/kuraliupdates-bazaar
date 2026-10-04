package com.kuraliupdates.bazaar.dto.auth;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @Size(max = 150, message = "Name must be at most 150 characters")
        String name,
        @Pattern(regexp = "\d{10}", message = "Please enter a valid 10-digit mobile number")
        String phone,
        @Size(max = 150, message = "Locality must be at most 150 characters")
        String locality,
        @Size(max = 500, message = "Address must be at most 500 characters")
        String address,
        @Size(max = 300, message = "Address line must be at most 300 characters")
        String addressLine1,
        @Size(max = 200, message = "Landmark must be at most 200 characters")
        String landmark,
        @Size(max = 500, message = "Formatted address must be at most 500 characters")
        String formattedAddress,
        @Size(max = 255, message = "Place ID must be at most 255 characters")
        String placeId,
        Double latitude,
        Double longitude
) {}

package com.kuraliupdates.bazaar.dto.address;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddressRequest(
        @Size(max = 50, message = "Label must be at most 50 characters")
        String label,
        @NotBlank(message = "Address details are required")
        @Size(max = 300, message = "Address line must be at most 300 characters")
        String addressLine1,
        @Size(max = 200, message = "Landmark must be at most 200 characters")
        String landmark,
        @Size(max = 500, message = "Formatted address must be at most 500 characters")
        String formattedAddress,
        @Size(max = 255, message = "Place ID must be at most 255 characters")
        String placeId,
        Double latitude,
        Double longitude,
        Boolean isDefault
) {}

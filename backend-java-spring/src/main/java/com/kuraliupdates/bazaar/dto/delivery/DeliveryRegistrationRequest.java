package com.kuraliupdates.bazaar.dto.delivery;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeliveryRegistrationRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Size(max = 30) String phone,
        @NotBlank @Email @Size(max = 255) String email,
        @Size(max = 500) String avatarUrl,
        @NotBlank String vehicleType,
        @NotBlank @Size(max = 50) String vehicleNumber,
        @NotBlank @Size(max = 50) String licenseNumber,
        @NotBlank @Size(max = 150) String currentLocality
) {}

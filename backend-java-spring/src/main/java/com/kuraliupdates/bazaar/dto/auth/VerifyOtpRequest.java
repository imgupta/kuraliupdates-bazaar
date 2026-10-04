package com.kuraliupdates.bazaar.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;

public record VerifyOtpRequest(
        String identifier,
        String otp,
        String type,
        String mode,
        String name,
        String role,
        String locality,
        String address,
        String addressLine1,
        String landmark,
        String formattedAddress,
        String placeId,
        Double latitude,
        Double longitude,
        @Email(message = "Please enter a valid email address")
        String email,
        @Pattern(regexp = "\\d{10}", message = "Please enter a valid 10-digit mobile number")
        String phone,
        String emailOtp,
        String phoneOtp,
        String storeName,
        String category,
        String vehicleType,
        String vehicleNumber,
        String licenseNumber
) {}

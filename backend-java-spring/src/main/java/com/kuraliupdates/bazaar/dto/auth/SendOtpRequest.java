package com.kuraliupdates.bazaar.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record SendOtpRequest(
        @NotBlank(message = "Email address or mobile number is required")
        String identifier,
        String type,
        String mode
) {}

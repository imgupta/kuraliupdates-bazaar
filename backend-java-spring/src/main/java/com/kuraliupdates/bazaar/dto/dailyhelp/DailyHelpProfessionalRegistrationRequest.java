package com.kuraliupdates.bazaar.dto.dailyhelp;

import jakarta.validation.constraints.NotBlank;

public record DailyHelpProfessionalRegistrationRequest(
        @NotBlank String name,
        @NotBlank String phone,
        @NotBlank String locality
) {}

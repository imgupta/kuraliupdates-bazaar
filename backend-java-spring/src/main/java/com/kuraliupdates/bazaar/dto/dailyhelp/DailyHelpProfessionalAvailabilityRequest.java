package com.kuraliupdates.bazaar.dto.dailyhelp;

import jakarta.validation.constraints.NotBlank;

public record DailyHelpProfessionalAvailabilityRequest(@NotBlank String status, String locality) {}

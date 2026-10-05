package com.kuraliupdates.bazaar.dto.dailyhelp;

import jakarta.validation.constraints.NotBlank;

public record DailyHelpStatusRequest(@NotBlank String professionalId, @NotBlank String status) {}

package com.kuraliupdates.bazaar.dto.dailyhelp;

import jakarta.validation.constraints.NotBlank;

public record DailyHelpStartRequest(@NotBlank String professionalId, @NotBlank String otp) {}

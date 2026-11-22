package com.kuraliupdates.bazaar.dto.dailyhelp;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DailyHelpCompleteRequest(
        @NotBlank String professionalId,
        @Size(max = 10) String otp,
        @Size(max = 1000) String overrideReason
) {}

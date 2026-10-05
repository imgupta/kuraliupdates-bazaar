package com.kuraliupdates.bazaar.dto.dailyhelp;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record DailyHelpBookingRequest(
        @NotBlank String serviceId,
        @NotBlank String buyerName,
        @NotBlank String buyerPhone,
        @NotBlank String address,
        @NotBlank String locality,
        @NotNull @FutureOrPresent LocalDateTime scheduledStart,
        @NotNull @DecimalMin("1.0") @DecimalMax("12.0") BigDecimal requestedHours
) {}

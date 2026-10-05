package com.kuraliupdates.bazaar.dto.dailyhelp;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record DailyHelpServiceAdminRequest(
        @NotBlank String category,
        @NotBlank String name,
        String description,
        @NotBlank String pricingUnit,
        @NotNull @DecimalMin("0.01") BigDecimal pricePerHour,
        @NotNull @Min(1) Integer minHours,
        String imageUrl,
        @NotNull Integer active
) { }

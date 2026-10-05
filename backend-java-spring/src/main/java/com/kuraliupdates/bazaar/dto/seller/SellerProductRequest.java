package com.kuraliupdates.bazaar.dto.seller;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.List;

public record SellerProductRequest(
        @NotBlank String title,
        @NotBlank String category,
        String description,
        String imageUrl,
        @NotNull @DecimalMin("0.01") BigDecimal mrp,
        @NotNull @DecimalMin("0.01") BigDecimal sellerPrice,
        @PositiveOrZero BigDecimal additionalDiscountPercent,
        @PositiveOrZero Integer stock,
        String unit,
        List<String> tags,
        Boolean isFeatured
) {}
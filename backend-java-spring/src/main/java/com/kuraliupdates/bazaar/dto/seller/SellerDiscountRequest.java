package com.kuraliupdates.bazaar.dto.seller;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record SellerDiscountRequest(
        @NotNull @DecimalMin("0") BigDecimal minBillAmount,
        @DecimalMin("0") BigDecimal discountPercentage,
        @DecimalMin("0") BigDecimal flatDiscount,
        @NotBlank String description
) {}
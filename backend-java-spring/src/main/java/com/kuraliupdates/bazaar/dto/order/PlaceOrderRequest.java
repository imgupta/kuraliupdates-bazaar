package com.kuraliupdates.bazaar.dto.order;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record PlaceOrderRequest(
        @NotBlank(message = "Buyer name is required")
        @Size(max = 150, message = "Buyer name must be at most 150 characters")
        String buyerName,
        @NotBlank(message = "Buyer phone is required")
        @Pattern(regexp = "\\d{10}", message = "Buyer phone must be 10 digits")
        String buyerPhone,
        @Email(message = "Buyer email must be valid")
        String buyerEmail,
        @NotBlank(message = "Delivery address is required")
        @Size(max = 500, message = "Delivery address must be at most 500 characters")
        String deliveryAddress,
        @NotBlank(message = "Delivery locality is required")
        @Size(max = 150, message = "Delivery locality must be at most 150 characters")
        String deliveryLocality,
        @NotBlank(message = "Seller is required")
        String sellerId,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal subtotal,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal discountAmount,
        @DecimalMin(value = "0.00", inclusive = true) BigDecimal deliveryFee,
        @NotNull @DecimalMin(value = "0.00", inclusive = true) BigDecimal finalPayable,
        @NotBlank(message = "Payment method is required") String paymentMethod,
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal distanceKm,
        @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0") Double deliveryLatitude,
        @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0") Double deliveryLongitude,
        @Size(max = 255) String deliveryPlaceId
) {}

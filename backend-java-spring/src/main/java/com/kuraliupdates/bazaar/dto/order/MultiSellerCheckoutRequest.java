package com.kuraliupdates.bazaar.dto.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/** Public multi-seller checkout contract. Seller and price data are resolved by the server. */
public record MultiSellerCheckoutRequest(
        @NotBlank @Size(max = 500) String deliveryAddress,
        @NotBlank @Size(max = 150) String deliveryLocality,
        @NotBlank String paymentMethod,
        @DecimalMin(value = "0.0") BigDecimal distanceKm,
        @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0") Double deliveryLatitude,
        @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0") Double deliveryLongitude,
        @Size(max = 255) String deliveryPlaceId,
        @Valid @jakarta.validation.constraints.NotEmpty List<OrderItemRequest> items
) {}

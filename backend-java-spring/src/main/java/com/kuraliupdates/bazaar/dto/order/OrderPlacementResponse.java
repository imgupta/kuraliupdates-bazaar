package com.kuraliupdates.bazaar.dto.order;

public record OrderPlacementResponse(
        OrderResponse order,
        String deliveryOtp
) {}

package com.kuraliupdates.bazaar.dto.order;

import java.util.List;

/** Atomic buyer checkout represented by one seller-owned order per store. */
public record MultiSellerOrderPlacementResponse(String checkoutGroupId, List<OrderPlacementResponse> orders) {}

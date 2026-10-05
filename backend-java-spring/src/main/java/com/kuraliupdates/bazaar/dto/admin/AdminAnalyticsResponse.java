package com.kuraliupdates.bazaar.dto.admin;

import java.math.BigDecimal;
import java.util.List;

public record AdminAnalyticsResponse(
        long totalStores,
        long approvedStores,
        long totalProducts,
        long totalOrders,
        BigDecimal totalGmv,
        long totalBuyers,
        long activeDeliveryAgents,
        List<CategoryMetric> categories,
        List<LocalityMetric> localities
) {
    public record CategoryMetric(
            String category,
            long productCount,
            long orderCount,
            BigDecimal revenue
    ) {}

    public record LocalityMetric(
            String locality,
            long sellerCount,
            long productCount,
            long orderCount
    ) {}
}

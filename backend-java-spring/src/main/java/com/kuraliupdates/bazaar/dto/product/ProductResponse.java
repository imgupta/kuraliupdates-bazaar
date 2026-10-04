package com.kuraliupdates.bazaar.dto.product;

import com.kuraliupdates.bazaar.entity.ProductEntity;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

public record ProductResponse(
        String productId,
        String sellerId,
        SellerSummary seller,
        String title,
        String category,
        String description,
        String imageUrl,
        BigDecimal mrp,
        BigDecimal sellerPrice,
        BigDecimal additionalDiscountPercent,
        BigDecimal effectivePrice,
        Integer stock,
        String unit,
        List<String> tags,
        Integer isFeatured
) {
    public static ProductResponse from(ProductEntity product) {
        var seller = product.getSeller();
        List<String> tagList = product.getTags() == null || product.getTags().isBlank()
                ? List.of()
                : Arrays.stream(product.getTags().split(","))
                    .map(String::trim).filter(s -> !s.isBlank()).toList();

        return new ProductResponse(
                product.getProductId(),
                seller == null ? null : seller.getSellerId(),
                seller == null ? null : new SellerSummary(
                        seller.getSellerId(), seller.getStoreName(), seller.getLocality(),
                        seller.getDistanceKm(), seller.getRating()),
                product.getTitle(), product.getCategory(), product.getDescription(),
                product.getImageUrl(), product.getMrp(), product.getSellerPrice(),
                product.getAdditionalDiscountPercent(), product.getEffectivePrice(),
                product.getStock(), product.getUnit(), tagList, product.getIsFeatured());
    }

    public record SellerSummary(
            String sellerId,
            String name,
            String locality,
            BigDecimal distanceKm,
            BigDecimal rating
    ) {}
}

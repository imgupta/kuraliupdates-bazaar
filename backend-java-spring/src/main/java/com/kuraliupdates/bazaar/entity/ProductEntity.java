package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "PRODUCTS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductEntity {

    @Id
    @Column(name = "PRODUCT_ID", length = 64)
    private String productId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SELLER_ID", nullable = false)
    private SellerEntity seller;

    @Column(name = "TITLE", nullable = false)
    private String title;

    @Column(name = "CATEGORY", nullable = false, length = 100)
    private String category;

    @Lob
    @Column(name = "DESCRIPTION")
    private String description;

    @Column(name = "IMAGE_URL", length = 500)
    private String imageUrl;

    @Column(name = "MRP", nullable = false, precision = 10, scale = 2)
    private BigDecimal mrp;

    @Column(name = "SELLER_PRICE", nullable = false, precision = 10, scale = 2)
    private BigDecimal sellerPrice;

    @Column(name = "ADDITIONAL_DISCOUNT_PCT", precision = 5, scale = 2)
    private BigDecimal additionalDiscountPercent;

    @Column(name = "STOCK")
    private Integer stock;

    @Column(name = "UNIT", length = 50)
    private String unit;

    @Column(name = "TAGS", length = 500)
    private String tags;

    @Column(name = "IS_FEATURED")
    private Integer isFeatured;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;
}

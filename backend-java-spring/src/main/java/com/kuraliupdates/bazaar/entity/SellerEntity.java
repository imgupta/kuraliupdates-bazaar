package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "SELLERS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerEntity {

    @Id
    @Column(name = "SELLER_ID", length = 64)
    private String sellerId;

    @Column(name = "STORE_NAME", nullable = false)
    private String storeName;

    @Column(name = "OWNER_NAME", nullable = false)
    private String ownerName;

    @Column(name = "EMAIL", nullable = false, unique = true)
    private String email;

    @Column(name = "PHONE", nullable = false)
    private String phone;

    @Column(name = "AVATAR_URL", length = 500)
    private String avatarUrl;

    @Column(name = "CATEGORY", nullable = false, length = 100)
    private String category;

    @Column(name = "ADDRESS", nullable = false, length = 500)
    private String address;

    @Column(name = "LOCALITY", nullable = false, length = 150)
    private String locality;

    @Column(name = "DISTANCE_KM", precision = 5, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "RATING", precision = 3, scale = 2)
    private BigDecimal rating;

    @Column(name = "REVIEW_COUNT")
    private Integer reviewCount;

    @Column(name = "STATUS", length = 20)
    private String status; // PENDING, APPROVED, REJECTED

    @Column(name = "GST_NUMBER", length = 50)
    private String gstNumber;

    @Column(name = "MIN_ORDER_FREE_DELIVERY", precision = 10, scale = 2)
    private BigDecimal minOrderForFreeDelivery;

    @Column(name = "BASE_DELIVERY_FEE", precision = 10, scale = 2)
    private BigDecimal baseDeliveryFee;

    @Lob
    @Column(name = "DESCRIPTION")
    private String description;

    @Column(name = "REGISTERED_AT")
    private LocalDateTime registeredAt;

    @Column(name = "APPROVED_AT")
    private LocalDateTime approvedAt;

    @OneToMany(mappedBy = "seller", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProductEntity> products = new ArrayList<>();

    @OneToMany(mappedBy = "seller", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BillDiscountEntity> billDiscounts = new ArrayList<>();
}

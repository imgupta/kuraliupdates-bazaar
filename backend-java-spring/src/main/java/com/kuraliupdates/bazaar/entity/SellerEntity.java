package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "SELLERS")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SellerEntity {
    @Id @Column(name = "SELLER_ID", length = 64) private String sellerId;
    @Column(name = "USER_ID", length = 64) private String userId;
    @Column(name = "STORE_NAME", nullable = false, length = 255) private String storeName;
    @Column(name = "OWNER_NAME", nullable = false, length = 150) private String ownerName;
    @Column(name = "EMAIL", nullable = false, unique = true, length = 255) private String email;
    @Column(name = "PHONE", nullable = false, length = 30) private String phone;
    @Column(name = "AVATAR_URL", length = 500) private String avatarUrl;
    @Column(name = "CATEGORY", nullable = false, length = 100) private String category;
    @Column(name = "ADDRESS", nullable = false, length = 500) private String address;
    @Column(name = "LOCALITY", nullable = false, length = 150) private String locality;
    @Column(name = "DISTANCE_KM", precision = 5, scale = 2) private BigDecimal distanceKm;
    @Column(name = "LATITUDE", precision = 10, scale = 7) private BigDecimal latitude;
    @Column(name = "LONGITUDE", precision = 10, scale = 7) private BigDecimal longitude;
    @Column(name = "LOCATION_VERIFIED", nullable = false) @Builder.Default private Boolean locationVerified = false;
    @Column(name = "RATING", precision = 3, scale = 2) private BigDecimal rating;
    @Column(name = "REVIEW_COUNT") private Integer reviewCount;
    @Column(name = "STATUS", length = 20) private String status;
    @Column(name = "STORE_OPEN", nullable = false) @Builder.Default private Boolean storeOpen = true;
    @Column(name = "GST_NUMBER", length = 50) private String gstNumber;
    @Column(name = "FSSAI_NUMBER", length = 50) private String fssaiNumber;
    @Column(name = "MIN_ORDER_FREE_DELIVERY", precision = 10, scale = 2) private BigDecimal minOrderForFreeDelivery;
    @Column(name = "BASE_DELIVERY_FEE", precision = 10, scale = 2) private BigDecimal baseDeliveryFee;
    @Lob @Column(name = "DESCRIPTION") private String description;
    @Column(name = "REGISTERED_AT") private LocalDateTime registeredAt;
    @Column(name = "APPROVED_AT") private LocalDateTime approvedAt;
    @Column(name = "BUSINESS_TYPE", length = 30) private String businessType;
    @Column(name = "REGISTERED_BUSINESS_NAME", length = 255) private String registeredBusinessName;
    @Column(name = "SHOP_NUMBER", length = 80) private String shopNumber;
    @Column(name = "WARD_NUMBER", length = 40) private String wardNumber;
    @Column(name = "STREET_LOCALITY", length = 255) private String streetLocality;
    @Column(name = "PIN_CODE", length = 6) private String pinCode;
    @Column(name = "LANDMARK", length = 255) private String landmark;
    @Column(name = "GST_VERIFICATION_STATUS", length = 20) private String gstVerificationStatus;
    @Column(name = "FSSAI_VERIFICATION_STATUS", length = 20) private String fssaiVerificationStatus;
    @Column(name = "FSSAI_LICENSE_TYPE", length = 40) private String fssaiLicenseType;
    @Column(name = "FSSAI_EXPIRY_DATE") private java.time.LocalDate fssaiExpiryDate;
    @Column(name = "OPENING_TIME", length = 5) private String openingTime;
    @Column(name = "CLOSING_TIME", length = 5) private String closingTime;
    @Column(name = "WEEKLY_CLOSED_DAY", length = 20) private String weeklyClosedDay;
    @Column(name = "PREPARATION_MINUTES") private Integer preparationMinutes;
    @Column(name = "AGREEMENT_VERSION", length = 40) private String agreementVersion;
    @Column(name = "AGREEMENT_ACCEPTED_AT") private LocalDateTime agreementAcceptedAt;
    @Column(name = "AGREEMENT_ACCEPTED_IP", length = 64) private String agreementAcceptedIp;

    @JsonIgnore
    @OneToMany(mappedBy = "seller", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default private List<ProductEntity> products = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "seller", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default private List<BillDiscountEntity> billDiscounts = new ArrayList<>();
}

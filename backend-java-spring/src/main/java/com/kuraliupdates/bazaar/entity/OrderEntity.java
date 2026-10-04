package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ORDERS")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderEntity {
    @Id @Column(name = "ORDER_ID", length = 64) private String orderId;
    @Column(name = "BUYER_NAME", nullable = false, length = 150) private String buyerName;
    @Column(name = "BUYER_PHONE", nullable = false, length = 30) private String buyerPhone;
    @Column(name = "BUYER_EMAIL", length = 255) private String buyerEmail;
    @Column(name = "DELIVERY_ADDRESS", nullable = false, length = 500) private String deliveryAddress;
    @Column(name = "DELIVERY_LOCALITY", nullable = false, length = 150) private String deliveryLocality;
    @Column(name = "DELIVERY_LATITUDE", precision = 10, scale = 7) private BigDecimal deliveryLatitude;
    @Column(name = "DELIVERY_LONGITUDE", precision = 10, scale = 7) private BigDecimal deliveryLongitude;
    @Column(name = "DELIVERY_PLACE_ID", length = 255) private String deliveryPlaceId;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "SELLER_ID", nullable = false)
    private SellerEntity seller;

    @Column(name = "SUBTOTAL", nullable = false, precision = 10, scale = 2) private BigDecimal subtotal;
    @Column(name = "BILL_DISCOUNT_AMOUNT", precision = 10, scale = 2) private BigDecimal billDiscountAmount;
    @Column(name = "COUPON_DISCOUNT_AMOUNT", precision = 10, scale = 2) private BigDecimal couponDiscountAmount;
    @Column(name = "COUPON_CODE", length = 50) private String couponCode;
    @Column(name = "DELIVERY_FEE", precision = 10, scale = 2) private BigDecimal deliveryFee;
    @Column(name = "IS_FREE_DELIVERY") private Integer isFreeDelivery;
    @Column(name = "TOTAL_AMOUNT", nullable = false, precision = 10, scale = 2) private BigDecimal totalAmount;
    @Column(name = "PAYMENT_METHOD", nullable = false, length = 30) private String paymentMethod;
    @Column(name = "PAYMENT_STATUS", length = 30) private String paymentStatus;
    @Column(name = "STATUS", length = 40) private String status;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "DELIVERY_AGENT_ID")
    private DeliveryAgentEntity deliveryAgent;

    @Column(name = "DELIVERY_OTP", nullable = false, length = 6) private String deliveryOtp;
    @Column(name = "DISTANCE_KM", precision = 5, scale = 2) private BigDecimal distanceKm;
    @Column(name = "ESTIMATED_DELIVERY_MINS") private Integer estimatedDeliveryMins;
    @Column(name = "PLACED_AT") private LocalDateTime placedAt;
    @Column(name = "UPDATED_AT") private LocalDateTime updatedAt;
}

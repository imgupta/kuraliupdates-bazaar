package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "BILL_DISCOUNTS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillDiscountEntity {

    @Id
    @Column(name = "RULE_ID", length = 64)
    private String ruleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SELLER_ID", nullable = false)
    private SellerEntity seller;

    @Column(name = "MIN_BILL_AMOUNT", nullable = false, precision = 10, scale = 2)
    private BigDecimal minBillAmount;

    @Column(name = "DISCOUNT_PCT", precision = 5, scale = 2)
    private BigDecimal discountPercentage;

    @Column(name = "FLAT_DISCOUNT", precision = 10, scale = 2)
    private BigDecimal flatDiscount;

    @Column(name = "DESCRIPTION", nullable = false)
    private String description;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;
}

package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "ORDER_ITEMS")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderItemEntity {
    @Id
    @Column(name = "ITEM_ID", length = 64)
    private String itemId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ORDER_ID", nullable = false)
    private OrderEntity order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "PRODUCT_ID", nullable = false)
    private ProductEntity product;

    @Column(name = "QUANTITY", nullable = false)
    private Integer quantity;

    @Column(name = "UNIT_PRICE", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "NEGOTIATED_PRICE", precision = 10, scale = 2)
    private BigDecimal negotiatedPrice;

    @Column(name = "TOTAL_PRICE", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;
}

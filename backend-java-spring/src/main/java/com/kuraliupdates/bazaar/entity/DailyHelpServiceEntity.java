package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "DAILY_HELP_SERVICES")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DailyHelpServiceEntity {
    @Id @Column(name = "SERVICE_ID", length = 64) private String serviceId;
    @Column(name = "CATEGORY", nullable = false, length = 100) private String category;
    @Column(name = "NAME", nullable = false, length = 150) private String name;
    @Column(name = "DESCRIPTION", length = 1000) private String description;
    @Column(name = "PRICING_UNIT", nullable = false, length = 20) private String pricingUnit;
    @Column(name = "PRICE_PER_HOUR", nullable = false, precision = 10, scale = 2) private BigDecimal pricePerHour;
    @Column(name = "MIN_HOURS", nullable = false) private Integer minHours;
    @Column(name = "IMAGE_URL", length = 500) private String imageUrl;
    @Column(name = "ACTIVE", nullable = false) private Integer active;
    @Column(name = "CREATED_AT", nullable = false) private LocalDateTime createdAt;
    @Column(name = "UPDATED_AT", nullable = false) private LocalDateTime updatedAt;
}

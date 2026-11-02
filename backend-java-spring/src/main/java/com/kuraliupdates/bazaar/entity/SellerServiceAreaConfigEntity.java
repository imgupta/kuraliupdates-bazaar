package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "SELLER_SERVICE_AREA_CONFIG")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SellerServiceAreaConfigEntity {
    @Id
    @Column(name = "CONFIG_KEY", length = 64)
    private String configKey;
    @Column(name = "CENTER_LATITUDE", nullable = false, precision = 10, scale = 7)
    private BigDecimal centerLatitude;
    @Column(name = "CENTER_LONGITUDE", nullable = false, precision = 10, scale = 7)
    private BigDecimal centerLongitude;
    @Column(name = "RADIUS_KM", nullable = false, precision = 6, scale = 2)
    private BigDecimal radiusKm;
    @Column(name = "ENABLED", nullable = false)
    private Integer enabled;
    @Column(name = "CONFIG_VERSION", nullable = false)
    private Integer configVersion;
    @Column(name = "UPDATED_BY", length = 64)
    private String updatedBy;
    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;
}

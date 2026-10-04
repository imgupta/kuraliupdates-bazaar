package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "USER_ADDRESSES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAddressEntity {
    @Id
    @Column(name = "ADDRESS_ID", length = 64)
    private String addressId;

    @Column(name = "USER_ID", nullable = false, length = 64)
    private String userId;

    @Column(name = "LABEL", nullable = false, length = 50)
    private String label;

    @Column(name = "ADDRESS_LINE1", nullable = false, length = 300)
    private String addressLine1;

    @Column(name = "LANDMARK", length = 200)
    private String landmark;

    @Column(name = "FORMATTED_ADDRESS", length = 500)
    private String formattedAddress;

    @Column(name = "PLACE_ID", length = 255)
    private String placeId;

    @Column(name = "LATITUDE", precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "LONGITUDE", precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "IS_DEFAULT", nullable = false)
    @Builder.Default
    private Integer isDefault = 0;

    @Column(name = "CREATED_AT", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "UPDATED_AT", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}

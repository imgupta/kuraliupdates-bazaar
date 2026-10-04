package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "DELIVERY_AGENTS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryAgentEntity {

    @Id
    @Column(name = "AGENT_ID", length = 64)
    private String agentId;

    @Column(name = "FULL_NAME", nullable = false)
    private String fullName;

    @Column(name = "PHONE", nullable = false, unique = true)
    private String phone;

    @Column(name = "EMAIL", nullable = false, unique = true)
    private String email;

    @Column(name = "AVATAR_URL", length = 500)
    private String avatarUrl;

    @Column(name = "VEHICLE_TYPE", nullable = false, length = 50)
    private String vehicleType;

    @Column(name = "VEHICLE_NUMBER", nullable = false, length = 50)
    private String vehicleNumber;

    @Column(name = "LICENSE_NUMBER", nullable = false, length = 50)
    private String licenseNumber;

    @Column(name = "STATUS", length = 20)
    private String status;

    @Column(name = "RATING", precision = 3, scale = 2)
    private BigDecimal rating;

    @Column(name = "TOTAL_TRIPS")
    private Integer totalTrips;

    @Column(name = "TODAY_EARNINGS", precision = 10, scale = 2)
    private BigDecimal todayEarnings;

    @Column(name = "TOTAL_EARNINGS", precision = 12, scale = 2)
    private BigDecimal totalEarnings;

    @Column(name = "CURRENT_LOCALITY", nullable = false, length = 150)
    private String currentLocality;

    @Column(name = "CURRENT_LATITUDE", precision = 10, scale = 7)
    private BigDecimal currentLatitude;

    @Column(name = "CURRENT_LONGITUDE", precision = 10, scale = 7)
    private BigDecimal currentLongitude;

    @Column(name = "LOCATION_UPDATED_AT")
    private LocalDateTime locationUpdatedAt;

    @Column(name = "REGISTERED_AT")
    private LocalDateTime registeredAt;
}

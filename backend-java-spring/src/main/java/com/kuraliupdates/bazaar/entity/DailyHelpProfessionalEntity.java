package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "DAILY_HELP_PROFESSIONALS")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DailyHelpProfessionalEntity {
    @Id @Column(name = "PROFESSIONAL_ID", length = 64) private String professionalId;
    @Column(name = "FULL_NAME", nullable = false, length = 150) private String fullName;
    @Column(name = "PHONE", nullable = false, length = 30) private String phone;
    @Column(name = "RATING", nullable = false, precision = 3, scale = 2) private BigDecimal rating;
    @Column(name = "REVIEW_COUNT", nullable = false) private Integer reviewCount;
    @Column(name = "CURRENT_LOCALITY", length = 150) private String currentLocality;
    @Column(name = "STATUS", nullable = false, length = 30) private String status;
    @Column(name = "VERIFIED", nullable = false) private Integer verified;
    @Column(name = "CURRENT_LATITUDE", precision = 10, scale = 7) private BigDecimal currentLatitude;
    @Column(name = "CURRENT_LONGITUDE", precision = 10, scale = 7) private BigDecimal currentLongitude;
    @Column(name = "REGISTERED_AT", nullable = false) private LocalDateTime registeredAt;
    @Column(name = "UPDATED_AT", nullable = false) private LocalDateTime updatedAt;
}

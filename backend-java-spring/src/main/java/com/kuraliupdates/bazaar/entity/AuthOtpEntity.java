package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "AUTH_OTPS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthOtpEntity {

    @Id
    @Column(name = "OTP_ID", length = 64)
    private String otpId;

    @Column(name = "IDENTIFIER", nullable = false)
    private String identifier; // Email or Phone

    @Column(name = "OTP_CODE", nullable = false, length = 10)
    private String otpCode;

    @Column(name = "OTP_TYPE", nullable = false, length = 20)
    private String otpType; // EMAIL or PHONE

    @Column(name = "IS_USED")
    @Builder.Default
    private Integer isUsed = 0;

    @Column(name = "EXPIRES_AT", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "CREATED_AT")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}

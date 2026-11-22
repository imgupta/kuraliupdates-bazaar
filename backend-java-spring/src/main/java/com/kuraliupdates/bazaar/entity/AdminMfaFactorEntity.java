package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "ADMIN_MFA_FACTORS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminMfaFactorEntity {
    @Id
    @Column(name = "USER_ID", length = 64)
    private String userId;

    @Column(name = "ENCRYPTED_SECRET", nullable = false, length = 512)
    private String encryptedSecret;

    @Column(name = "ENABLED", nullable = false)
    @Builder.Default
    private Integer enabled = 0;

    @Column(name = "STEP_UP_TOKEN_HASH", length = 64)
    private String stepUpTokenHash;

    @Column(name = "STEP_UP_SESSION_HASH", length = 64)
    private String stepUpSessionHash;

    @Column(name = "STEP_UP_EXPIRES_AT")
    private LocalDateTime stepUpExpiresAt;

    @Column(name = "LAST_TOTP_COUNTER")
    private Long lastTotpCounter;

    @Column(name = "CREATED_AT", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;
}

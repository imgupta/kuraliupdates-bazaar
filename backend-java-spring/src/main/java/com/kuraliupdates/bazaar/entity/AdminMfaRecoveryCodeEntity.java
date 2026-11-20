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
@Table(name = "ADMIN_MFA_RECOVERY_CODES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminMfaRecoveryCodeEntity {
    @Id
    @Column(name = "CODE_HASH", length = 64)
    private String codeHash;

    @Column(name = "USER_ID", nullable = false, length = 64)
    private String userId;

    @Column(name = "USED_AT")
    private LocalDateTime usedAt;

    @Column(name = "CREATED_AT", nullable = false)
    private LocalDateTime createdAt;
}

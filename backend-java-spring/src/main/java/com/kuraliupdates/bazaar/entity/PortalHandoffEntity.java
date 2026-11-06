package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "AUTH_PORTAL_HANDOFFS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortalHandoffEntity {

    @Id
    @Column(name = "CODE_HASH", nullable = false, length = 64)
    private String codeHash;

    @Column(name = "SESSION_TOKEN", nullable = false, length = 128)
    private String sessionToken;

    @Column(name = "TARGET_ROLE", nullable = false, length = 30)
    private String role;

    @Column(name = "CREATED_AT", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "EXPIRES_AT", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "CONSUMED_AT")
    private LocalDateTime consumedAt;
}

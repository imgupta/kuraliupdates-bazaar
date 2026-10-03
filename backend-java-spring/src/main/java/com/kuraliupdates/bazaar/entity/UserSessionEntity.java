package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "USER_SESSIONS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSessionEntity {

    @Id
    @Column(name = "SESSION_TOKEN", length = 128)
    private String sessionToken;

    @Column(name = "USER_ID", nullable = false, length = 64)
    private String userId;

    @Column(name = "CREATED_AT")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "EXPIRES_AT", nullable = false)
    private LocalDateTime expiresAt;
}

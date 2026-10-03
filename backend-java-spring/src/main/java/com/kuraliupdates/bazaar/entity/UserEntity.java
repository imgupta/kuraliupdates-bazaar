package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "USERS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEntity {

    @Id
    @Column(name = "USER_ID", length = 64)
    private String userId;

    @Column(name = "EMAIL", nullable = false, unique = true)
    private String email;

    @Column(name = "PHONE", nullable = false, unique = true, length = 30)
    private String phone;

    @Column(name = "NAME", nullable = false, length = 150)
    private String name;

    @Column(name = "ROLE", length = 30)
    private String role; // BUYER, SELLER, DELIVERY, ADMIN

    @Column(name = "LOCALITY", length = 150)
    private String locality;

    @Column(name = "ADDRESS", length = 500)
    private String address;

    @Column(name = "IS_VERIFIED")
    @Builder.Default
    private Integer isVerified = 1;

    @Column(name = "IS_ADMIN")
    @Builder.Default
    private Integer isAdmin = 0;

    @Column(name = "AVATAR_URL", length = 500)
    private String avatarUrl;

    @Column(name = "CREATED_AT")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "LAST_LOGIN")
    @Builder.Default
    private LocalDateTime lastLogin = LocalDateTime.now();
}

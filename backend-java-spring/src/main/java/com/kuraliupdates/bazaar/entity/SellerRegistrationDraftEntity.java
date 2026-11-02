package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "SELLER_REGISTRATION_DRAFTS")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SellerRegistrationDraftEntity {
    @Id
    @Column(name = "USER_ID", length = 64)
    private String userId;

    @Lob
    @Column(name = "DRAFT_JSON", nullable = false)
    private String draftJson;

    @Column(name = "CURRENT_STEP", nullable = false)
    private Integer currentStep;

    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;
}

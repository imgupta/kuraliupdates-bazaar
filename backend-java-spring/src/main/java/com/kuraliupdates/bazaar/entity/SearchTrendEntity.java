package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "SEARCH_TRENDS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchTrendEntity {
    @Id
    @Column(name = "SEARCH_ID", length = 64)
    private String searchId;

    @Column(name = "QUERY_TEXT", nullable = false, length = 255)
    private String queryText;

    @Column(name = "NORMALIZED_QUERY", nullable = false, length = 255)
    private String normalizedQuery;

    @Column(name = "USER_ID", length = 64)
    private String userId;

    @Column(name = "CREATED_AT", nullable = false)
    private LocalDateTime createdAt;
}

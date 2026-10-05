package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.SearchTrendEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SearchTrendRepository extends JpaRepository<SearchTrendEntity, String> {

    interface SearchTrendMetric {
        String getQuery();
        Long getSearchCount();
    }

    @Query("""
        SELECT s.normalizedQuery AS query, COUNT(s) AS searchCount
        FROM SearchTrendEntity s
        WHERE s.createdAt >= :since
        GROUP BY s.normalizedQuery
        ORDER BY COUNT(s) DESC
        """)
    List<SearchTrendMetric> findTopSearchesSince(LocalDateTime since, Pageable pageable);
}

package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.SearchTrendEntity;
import com.kuraliupdates.bazaar.repository.SearchTrendRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class SearchAnalyticsController {

    private final SearchTrendRepository searchTrendRepository;

    @PostMapping("/search")
    public ResponseEntity<Void> recordSearch(@RequestBody SearchEventRequest request) {
        if (request == null || request.query() == null) {
            return ResponseEntity.badRequest().build();
        }

        String normalized = request.query().trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
        if (normalized.isBlank() || normalized.length() > 255) {
            return ResponseEntity.badRequest().build();
        }

        String displayQuery = request.query().trim().replaceAll("\\s+", " ");
        if (displayQuery.length() > 255) {
            displayQuery = displayQuery.substring(0, 255);
        }

        searchTrendRepository.save(SearchTrendEntity.builder()
                .searchId(UUID.randomUUID().toString())
                .queryText(displayQuery)
                .normalizedQuery(normalized)
                .userId(request.userId())
                .createdAt(LocalDateTime.now())
                .build());

        return ResponseEntity.accepted().build();
    }

    public record SearchEventRequest(String query, String userId) {
    }
}

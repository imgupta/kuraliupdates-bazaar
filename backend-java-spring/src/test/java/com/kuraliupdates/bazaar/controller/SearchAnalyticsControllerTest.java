package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.SearchTrendEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.repository.SearchTrendRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SearchAnalyticsControllerTest {

    @Test
    void ignoresClientSuppliedUserIdForAnonymousSearch() {
        SearchTrendRepository repository = mock(SearchTrendRepository.class);
        SearchAnalyticsController controller = new SearchAnalyticsController(repository);

        controller.recordSearch(
                new SearchAnalyticsController.SearchEventRequest("milk", "attacker-controlled-user"),
                null);

        var captor = org.mockito.ArgumentCaptor.forClass(SearchTrendEntity.class);
        verify(repository).save(captor.capture());
        assertNull(captor.getValue().getUserId());
    }

    @Test
    void attributesSearchToAuthenticatedPrincipalNotClientSuppliedUserId() {
        SearchTrendRepository repository = mock(SearchTrendRepository.class);
        SearchAnalyticsController controller = new SearchAnalyticsController(repository);
        UserEntity user = UserEntity.builder().userId("verified-user-123").role("BUYER").build();
        var authentication = new UsernamePasswordAuthenticationToken(
                user, null, List.of(new SimpleGrantedAuthority("ROLE_BUYER")));

        controller.recordSearch(
                new SearchAnalyticsController.SearchEventRequest("milk", "attacker-controlled-user"),
                authentication);

        var captor = org.mockito.ArgumentCaptor.forClass(SearchTrendEntity.class);
        verify(repository).save(captor.capture());
        assertEquals("verified-user-123", captor.getValue().getUserId());
    }
}

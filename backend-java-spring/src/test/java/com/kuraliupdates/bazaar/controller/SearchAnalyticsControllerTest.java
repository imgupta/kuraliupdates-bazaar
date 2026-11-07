package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.SearchTrendEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import org.springframework.http.HttpStatus;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.repository.SearchTrendRepository;
import com.kuraliupdates.bazaar.service.ApiRateLimitService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.time.Duration;
import jakarta.servlet.http.HttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SearchAnalyticsControllerTest {

    @Test
    void rejectsMissingBlankAndOversizedSearchQueriesWithoutPersistence() {
        SearchTrendRepository repository = mock(SearchTrendRepository.class);
        ApiRateLimitService rateLimit = mock(ApiRateLimitService.class);
        SearchAnalyticsController controller = new SearchAnalyticsController(repository, rateLimit);

        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST,
                controller.recordSearch(null, null, null).getStatusCode());
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST,
                controller.recordSearch(new SearchAnalyticsController.SearchEventRequest("   ", null), null, null).getStatusCode());
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST,
                controller.recordSearch(new SearchAnalyticsController.SearchEventRequest("x".repeat(256), null), null, null).getStatusCode());

        verifyNoInteractions(repository, rateLimit);
    }

    @Test
    void normalizesWhitespaceAndStoresOnlyBoundedDisplayQuery() {
        SearchTrendRepository repository = mock(SearchTrendRepository.class);
        SearchAnalyticsController controller = new SearchAnalyticsController(repository, mock(ApiRateLimitService.class));

        var response = controller.recordSearch(
                new SearchAnalyticsController.SearchEventRequest("  Milk   and   Bread  ", "spoofed-user"), null, null);

        assertEquals(org.springframework.http.HttpStatus.ACCEPTED, response.getStatusCode());
        var captor = org.mockito.ArgumentCaptor.forClass(SearchTrendEntity.class);
        verify(repository).save(captor.capture());
        assertEquals("Milk and Bread", captor.getValue().getQueryText());
        assertEquals("milk and bread", captor.getValue().getNormalizedQuery());
        assertNull(captor.getValue().getUserId());
    }

    @Test
    void ignoresClientSuppliedUserIdForAnonymousSearch() {
        SearchTrendRepository repository = mock(SearchTrendRepository.class);
        SearchAnalyticsController controller = new SearchAnalyticsController(repository, mock(ApiRateLimitService.class));

        controller.recordSearch(
                new SearchAnalyticsController.SearchEventRequest("milk", "attacker-controlled-user"),
                null, null);

        var captor = org.mockito.ArgumentCaptor.forClass(SearchTrendEntity.class);
        verify(repository).save(captor.capture());
        assertNull(captor.getValue().getUserId());
    }

    @Test
    void attributesSearchToAuthenticatedPrincipalNotClientSuppliedUserId() {
        SearchTrendRepository repository = mock(SearchTrendRepository.class);
        SearchAnalyticsController controller = new SearchAnalyticsController(repository, mock(ApiRateLimitService.class));
        UserEntity user = UserEntity.builder().userId("verified-user-123").role("BUYER").build();
        var authentication = new UsernamePasswordAuthenticationToken(
                user, null, List.of(new SimpleGrantedAuthority("ROLE_BUYER")));

        controller.recordSearch(
                new SearchAnalyticsController.SearchEventRequest("milk", "attacker-controlled-user"),
                authentication, null);

        var captor = org.mockito.ArgumentCaptor.forClass(SearchTrendEntity.class);
        verify(repository).save(captor.capture());
        assertEquals("verified-user-123", captor.getValue().getUserId());
    }
    @Test
    void appliesAnonymousIpRateLimitBeforePersistingAnalytics() {
        SearchTrendRepository repository = mock(SearchTrendRepository.class);
        ApiRateLimitService rateLimit = mock(ApiRateLimitService.class);
        SearchAnalyticsController controller = new SearchAnalyticsController(repository, rateLimit);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("203.0.113.10");

        controller.recordSearch(new SearchAnalyticsController.SearchEventRequest("milk", null), null, request);

        verify(rateLimit).requireAllowed("search-analytics", "ip:203.0.113.10", 600, Duration.ofMinutes(1));
        verify(repository).save(any(SearchTrendEntity.class));
    }

    @Test
    void appliesLowerAuthenticatedUserRateLimitUsingVerifiedPrincipal() {
        SearchTrendRepository repository = mock(SearchTrendRepository.class);
        ApiRateLimitService rateLimit = mock(ApiRateLimitService.class);
        SearchAnalyticsController controller = new SearchAnalyticsController(repository, rateLimit);
        UserEntity user = UserEntity.builder().userId("verified-user-123").role("BUYER").build();
        var authentication = new UsernamePasswordAuthenticationToken(
                user, null, List.of(new SimpleGrantedAuthority("ROLE_BUYER")));

        controller.recordSearch(new SearchAnalyticsController.SearchEventRequest("milk", null), authentication, null);

        verify(rateLimit).requireAllowed("search-analytics", "user:verified-user-123", 300, Duration.ofMinutes(1));
    }


    @Test
    void rejectsRateLimitedAnalyticsBeforePersistingAnEvent() {
        SearchTrendRepository repository = mock(SearchTrendRepository.class);
        ApiRateLimitService rateLimit = mock(ApiRateLimitService.class);
        SearchAnalyticsController controller = new SearchAnalyticsController(repository, rateLimit);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("203.0.113.11");
        doThrow(new ApiException(HttpStatus.TOO_MANY_REQUESTS, "rate limited"))
                .when(rateLimit).requireAllowed("search-analytics", "ip:203.0.113.11", 600, Duration.ofMinutes(1));

        assertThrows(ApiException.class, () -> controller.recordSearch(
                new SearchAnalyticsController.SearchEventRequest("milk", null), null, request));

        verifyNoInteractions(repository);
    }

}

package com.kuraliupdates.bazaar.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class MigrationReadinessFilterTest {

    @Test
    void allowsLivenessWhileMigrationIsPending() throws Exception {
        DatabaseMigrationState state = new DatabaseMigrationState();
        MigrationReadinessFilter filter = new MigrationReadinessFilter(state);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/health/live");
        request.setServletPath("/health/live");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        assertTrue(chain.getRequest() != null);
    }

    @Test
    void blocksBusinessRequestsUntilMigrationIsReady() throws Exception {
        DatabaseMigrationState state = new DatabaseMigrationState();
        state.markRunning();
        MigrationReadinessFilter filter = new MigrationReadinessFilter(state);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/buyers/orders");
        request.setServletPath("/buyers/orders");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(503, response.getStatus());
        assertTrue(response.getContentAsString().contains("DATABASE_MIGRATION_RUNNING"));
        assertNull(chain.getRequest());
    }

    @Test
    void allowsBusinessRequestsAfterMigrationIsReady() throws Exception {
        DatabaseMigrationState state = new DatabaseMigrationState();
        state.markReady();
        MigrationReadinessFilter filter = new MigrationReadinessFilter(state);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/buyers/orders");
        request.setServletPath("/buyers/orders");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        assertTrue(chain.getRequest() != null);
    }
}

package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class SellerRegistrationOtpConfigServiceTest {
    @Test
    void refusesToDisableBothContactVerificationChannelsBeforeDatabaseAccess() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        SellerRegistrationOtpConfigService service = new SellerRegistrationOtpConfigService(jdbc);

        ApiException error = assertThrows(ApiException.class,
                () -> service.update(false, false, "admin-user-id"));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(jdbc);
    }
}

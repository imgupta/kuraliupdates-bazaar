package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.SellerRegistrationOtpConfigService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SellerRegistrationOtpConfigControllerTest {
    @Test
    void publicSettingsExposeOnlyRequiredChannelFlags() {
        SellerRegistrationOtpConfigService service = mock(SellerRegistrationOtpConfigService.class);
        when(service.get()).thenReturn(Map.of("emailOtpEnabled", false, "mobileOtpEnabled", true, "updatedBy", "root", "updatedAt", "internal"));
        Map<String, Object> response = new SellerRegistrationOtpConfigController(service).publicSettings();
        assertEquals(Map.of("emailOtpRequired", false, "mobileOtpRequired", true), response);
        assertFalse(response.containsKey("updatedBy"));
        assertFalse(response.containsKey("updatedAt"));
    }

    @Test
    void rejectsPartialAdminUpdates() {
        SellerRegistrationOtpConfigService service = mock(SellerRegistrationOtpConfigService.class);
        SellerRegistrationOtpConfigController controller = new SellerRegistrationOtpConfigController(service);
        assertThrows(ResponseStatusException.class, () -> controller.update(Map.of("emailOtpEnabled", true)));
        verifyNoInteractions(service);
    }

    @Test
    void returnsOnlyAuditItemsFromHistoryEndpoint() {
        SellerRegistrationOtpConfigService service = mock(SellerRegistrationOtpConfigService.class);
        List<Map<String, Object>> items = List.of(Map.of("changedBy", "admin", "emailOtpEnabled", true));
        when(service.history(10)).thenReturn(items);
        Map<String, Object> response = new SellerRegistrationOtpConfigController(service).adminHistory(10);
        assertEquals(items, response.get("items"));
        assertEquals(1, response.size());
    }
}

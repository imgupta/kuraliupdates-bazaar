package com.kuraliupdates.bazaar.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuraliupdates.bazaar.entity.SellerRegistrationDraftEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.SellerRegistrationDraftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SellerRegistrationDraftServiceTest {
    private SellerRegistrationDraftRepository repository;
    private SellerRegistrationDraftService service;

    @BeforeEach
    void setUp() {
        repository = mock(SellerRegistrationDraftRepository.class);
        service = new SellerRegistrationDraftService(repository, new ObjectMapper());
        when(repository.findById("user-1")).thenReturn(Optional.empty());
        when(repository.save(any(SellerRegistrationDraftEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void saveRecursivelyRemovesCredentialsAndUploadedFilePayloads() throws Exception {
        Map<String, Object> nested = new LinkedHashMap<>();
        nested.put("shopName", "Kurali Store");
        nested.put("emailOtp", "123456");
        nested.put("access_token", "secret");
        nested.put("documentData", "base64-secret");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("currentStep", 3);
        payload.put("storeName", "Kurali Store");
        payload.put("location", nested);
        payload.put("shopFrontPhoto", "base64-photo");
        payload.put("agreementAccepted", true);

        service.save("user-1", payload);

        var captor = org.mockito.ArgumentCaptor.forClass(SellerRegistrationDraftEntity.class);
        verify(repository).save(captor.capture());
        Map<?, ?> stored = new ObjectMapper().readValue(captor.getValue().getDraftJson(), Map.class);
        Map<?, ?> storedLocation = (Map<?, ?>) stored.get("location");
        assertEquals("Kurali Store", stored.get("storeName"));
        assertEquals("Kurali Store", storedLocation.get("shopName"));
        assertFalse(stored.containsKey("shopFrontPhoto"));
        assertFalse(storedLocation.containsKey("emailOtp"));
        assertFalse(storedLocation.containsKey("access_token"));
        assertFalse(storedLocation.containsKey("documentData"));
    }

    @Test
    void rejectsStepsOutsideWizardRange() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("currentStep", 6);
        assertThrows(ApiException.class, () -> service.save("user-1", payload));
        verify(repository, never()).save(any());
    }

    @Test
    void returnsEmptyDraftForNewAccount() {
        assertEquals(Map.of("exists", false), service.get("user-1"));
    }
}

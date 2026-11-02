package com.kuraliupdates.bazaar.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuraliupdates.bazaar.entity.SellerRegistrationDraftEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.SellerRegistrationDraftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SellerRegistrationDraftService {
    private static final int MAX_JSON_CHARS = 100_000;
    private final SellerRegistrationDraftRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Map<String, Object> get(String userId) {
        return repository.findById(userId).map(draft -> {
            try {
                Map<String, Object> result = objectMapper.readValue(draft.getDraftJson(), Map.class);
                result.put("currentStep", draft.getCurrentStep());
                result.put("updatedAt", draft.getUpdatedAt());
                return result;
            } catch (JsonProcessingException ex) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Saved seller draft could not be read");
            }
        }).orElse(Map.of("exists", false));
    }

    @Transactional
    public Map<String, Object> save(String userId, Map<String, Object> payload) {
        Object rawStep = payload.get("currentStep");
        int step = rawStep instanceof Number number ? number.intValue() : 1;
        if (step < 1 || step > 5) throw new ApiException(HttpStatus.BAD_REQUEST, "Seller draft step must be between 1 and 5");
        Map<String, Object> safe = new java.util.LinkedHashMap<>(payload);
        safe.remove("emailOtp");
        safe.remove("otp");
        safe.remove("token");
        safe.remove("shopFrontPhoto");
        safe.remove("gstCertificate");
        safe.remove("fssaiCertificate");
        try {
            String json = objectMapper.writeValueAsString(safe);
            if (json.length() > MAX_JSON_CHARS) throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "Seller draft is too large");
            SellerRegistrationDraftEntity entity = repository.findById(userId)
                    .orElseGet(() -> SellerRegistrationDraftEntity.builder().userId(userId).build());
            entity.setDraftJson(json);
            entity.setCurrentStep(step);
            entity.setUpdatedAt(LocalDateTime.now());
            repository.save(entity);
            return Map.of("success", true, "currentStep", step, "updatedAt", entity.getUpdatedAt());
        } catch (JsonProcessingException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Seller draft contains unsupported data");
        }
    }

    @Transactional
    public void delete(String userId) {
        repository.deleteById(userId);
    }
}

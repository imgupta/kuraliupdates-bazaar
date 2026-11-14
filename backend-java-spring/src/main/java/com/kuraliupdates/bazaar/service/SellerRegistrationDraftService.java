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
import java.util.Set;

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
        if (step < 1 || step > 4) throw new ApiException(HttpStatus.BAD_REQUEST, "Seller draft step must be between 1 and 4");
        Map<String, Object> safe = sanitizeMap(payload);
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


    private Map<String, Object> sanitizeMap(Map<String, Object> input) {
        Map<String, Object> safe = new java.util.LinkedHashMap<>();
        input.forEach((key, value) -> {
            String normalized = key == null ? "" : key.replaceAll("[^A-Za-z0-9]", "").toLowerCase(java.util.Locale.ROOT);
            if (normalized.contains("otp") || normalized.contains("token")
                    || Set.of("shopfrontphoto", "gstcertificate", "fssaicertificate", "file", "files",
                    "documentdata", "documentbytes", "base64", "binarycontent").contains(normalized)) return;
            if (value instanceof Map<?, ?> nested) {
                Map<String, Object> child = new java.util.LinkedHashMap<>();
                nested.forEach((childKey, childValue) -> {
                    if (childKey instanceof String stringKey) child.put(stringKey, childValue);
                });
                safe.put(key, sanitizeMap(child));
            } else if (value instanceof java.util.List<?> list) {
                safe.put(key, list.stream().map(item -> {
                    if (item instanceof Map<?, ?> nestedItem) {
                        Map<String, Object> child = new java.util.LinkedHashMap<>();
                        nestedItem.forEach((childKey, childValue) -> {
                            if (childKey instanceof String stringKey) child.put(stringKey, childValue);
                        });
                        return sanitizeMap(child);
                    }
                    return item;
                }).toList());
            } else {
                safe.put(key, value);
            }
        });
        return safe;
    }

    @Transactional
    public void delete(String userId) {
        repository.deleteById(userId);
    }
}

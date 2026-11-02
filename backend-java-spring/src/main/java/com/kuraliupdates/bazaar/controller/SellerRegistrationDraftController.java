package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.SellerRegistrationDraftService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/sellers/me/draft")
public class SellerRegistrationDraftController {
    private final AuthService authService;
    private final SellerRegistrationDraftService draftService;

    @GetMapping
    public Map<String, Object> get(@RequestHeader(value = "Authorization", required = false) String authorization) {
        var user = authService.requireUser(bearer(authorization));
        return draftService.get(user.getUserId());
    }

    @PutMapping
    public Map<String, Object> save(@RequestHeader(value = "Authorization", required = false) String authorization,
                                    @RequestBody Map<String, Object> payload) {
        var user = authService.requireUser(bearer(authorization));
        if (payload == null || payload.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Seller draft is required");
        return draftService.save(user.getUserId(), payload);
    }

    @DeleteMapping
    public Map<String, Object> delete(@RequestHeader(value = "Authorization", required = false) String authorization) {
        var user = authService.requireUser(bearer(authorization));
        draftService.delete(user.getUserId());
        return Map.of("success", true);
    }

    private String bearer(String header) {
        return header != null && header.startsWith("Bearer ") ? header.substring(7).trim() : null;
    }
}

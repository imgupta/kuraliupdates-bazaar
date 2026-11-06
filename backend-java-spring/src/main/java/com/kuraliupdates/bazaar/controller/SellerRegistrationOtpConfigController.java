package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.SellerRegistrationOtpConfigService;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import org.springframework.http.HttpStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SellerRegistrationOtpConfigController {
    private final SellerRegistrationOtpConfigService config;

    @GetMapping({"/seller-registration/otp-settings", "/registration/otp-settings"})
    public Map<String, Object> publicSettings() {
        Map<String, Object> current = config.get();
        return Map.of("emailOtpRequired", current.get("emailOtpEnabled"),
                "mobileOtpRequired", current.get("mobileOtpEnabled"));
    }

    @GetMapping("/admin/seller-registration/otp-settings")
    public Map<String, Object> adminSettings() { return config.get(); }

    @GetMapping("/admin/seller-registration/otp-settings/history")
    public Map<String, Object> adminHistory(@RequestParam(defaultValue = "20") int limit) {
        return Map.of("items", config.history(limit));
    }

    @PutMapping("/admin/seller-registration/otp-settings")
    public Map<String, Object> update(@RequestBody Map<String, Boolean> body) {
        if (body.get("emailOtpEnabled") == null || body.get("mobileOtpEnabled") == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "Both email and mobile OTP settings are required");
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserEntity user)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Authenticated administrator identity is required");
        }
        String actor = user.getUserId();
        return config.update(body.get("emailOtpEnabled"), body.get("mobileOtpEnabled"), actor);
    }
}

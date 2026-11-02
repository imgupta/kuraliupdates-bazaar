package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.SellerRegistrationOtpConfigService;
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
    public Map<String, Object> adminSettings() {
        return config.get();
    }

    @PutMapping("/admin/seller-registration/otp-settings")
    public Map<String, Object> update(@RequestBody Map<String, Boolean> body) {
        if (body.get("emailOtpEnabled") == null || body.get("mobileOtpEnabled") == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Both email and mobile OTP settings are required");
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actor = auth == null ? "ADMIN" : auth.getName();
        return config.update(body.get("emailOtpEnabled"), body.get("mobileOtpEnabled"), actor);
    }
}

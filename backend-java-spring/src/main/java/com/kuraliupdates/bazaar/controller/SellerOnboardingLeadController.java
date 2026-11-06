package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.SellerOnboardingLeadService;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.ApiRateLimitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.time.Duration;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/seller-registration/leads")
public class SellerOnboardingLeadController {
    private final SellerOnboardingLeadService leads;
    private final ApiRateLimitService rateLimit;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> start(@RequestBody Map<String,String> body) {
        String rawEmail = body == null ? null : body.get("email");
        String rawPhone = body == null ? null : body.get("phone");
        String ownerName = body == null ? null : body.get("ownerName");
        if (ownerName != null && ownerName.length() > 150) throw new ApiException(HttpStatus.BAD_REQUEST, "Owner name must be 150 characters or fewer");
        if (rawEmail != null && rawEmail.length() > 254) throw new ApiException(HttpStatus.BAD_REQUEST, "Email address is too long");
        if (rawPhone != null && rawPhone.length() > 30) throw new ApiException(HttpStatus.BAD_REQUEST, "Phone number is too long");
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase();
        String phone = rawPhone == null ? "" : rawPhone.replaceAll("\\D", "");
        if (phone.length() == 12 && phone.startsWith("91")) phone = phone.substring(2);
        rateLimit.requireAllowed("seller-lead-start-contact", email + ":" + phone, 3, Duration.ofHours(1));
        rateLimit.requireAllowed("seller-lead-start-email", email, 3, Duration.ofHours(1));
        rateLimit.requireAllowed("seller-lead-start-phone", phone, 3, Duration.ofHours(1));
        return leads.start(ownerName, email, phone);
    }

    @PostMapping("/{leadId}/send-contact-otps")
    public Map<String,Object> sendContactOtps(@PathVariable String leadId) {
        validateLeadId(leadId);
        rateLimit.requireAllowed("seller-lead-send-otp", leadId, 3, Duration.ofHours(1));
        return leads.sendContactOtps(leadId);
    }

    @PostMapping("/{leadId}/verify-contact")
    public Map<String,Object> verifyContact(@PathVariable String leadId, @RequestBody Map<String,String> body) {
        validateLeadId(leadId);
        if (body == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Contact OTP values are required");
        rateLimit.requireAllowed("seller-lead-verify", leadId, 10, Duration.ofMinutes(15));
        return leads.verifyContact(leadId, body.get("emailOtp"), body.get("phoneOtp"));
    }

    @PostMapping("/{leadId}/callback")
    public Map<String,Object> callback(@PathVariable String leadId, @RequestBody Map<String,Object> body) {
        validateLeadId(leadId);
        rateLimit.requireAllowed("seller-lead-callback", leadId, 2, Duration.ofDays(1));
        return leads.requestCallback(leadId, body != null && Boolean.TRUE.equals(body.get("consent")),
                body == null || body.get("preferredTime") == null ? null : String.valueOf(body.get("preferredTime")));
    }
    private void validateLeadId(String leadId) {
        try {
            UUID.fromString(leadId);
        } catch (RuntimeException invalid) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid seller registration reference");
        }
    }
}

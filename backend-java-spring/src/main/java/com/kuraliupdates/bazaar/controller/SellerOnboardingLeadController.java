package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.SellerOnboardingLeadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/seller-registration/leads")
public class SellerOnboardingLeadController {
    private final SellerOnboardingLeadService leads;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> start(@RequestBody Map<String,String> body) {
        return leads.start(body.get("ownerName"), body.get("email"), body.get("phone"));
    }

    @PostMapping("/{leadId}/verify-contact")
    public Map<String,Object> verifyContact(@PathVariable String leadId, @RequestBody Map<String,String> body) {
        return leads.verifyContact(leadId, body.get("emailOtp"), body.get("phoneOtp"));
    }

    @PostMapping("/{leadId}/callback")
    public Map<String,Object> callback(@PathVariable String leadId, @RequestBody Map<String,Object> body) {
        return leads.requestCallback(leadId, Boolean.TRUE.equals(body.get("consent")),
                body.get("preferredTime") == null ? null : String.valueOf(body.get("preferredTime")));
    }
}

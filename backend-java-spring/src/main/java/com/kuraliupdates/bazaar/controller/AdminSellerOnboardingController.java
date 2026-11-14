package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.service.SellerOnboardingLeadService;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import org.springframework.http.HttpStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/seller-leads")
public class AdminSellerOnboardingController {
    private final SellerOnboardingLeadService leads;

    @GetMapping
    public List<Map<String,Object>> list(
            @RequestParam(required=false) String status,
            @RequestParam(required=false) String search,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="25") int size,
            @RequestParam(defaultValue="false") boolean dueOnly) {
        return leads.list(status, search, page, size, dueOnly);
    }

    @GetMapping("/assignees")
    public List<Map<String,Object>> assignees() {
        return leads.assignees();
    }

    @GetMapping("/summary")
    public Map<String,Object> summary() {
        return leads.summary();
    }

    @GetMapping("/{leadId}/activity")
    public List<Map<String,Object>> activity(@PathVariable String leadId) {
        return leads.activity(leadId);
    }

    @PostMapping("/{leadId}/resend-contact-otps")
    public Map<String,Object> resendContactOtps(@PathVariable String leadId) {
        return leads.resendContactOtpsByAdmin(leadId, actor());
    }

    @PatchMapping("/{leadId}")
    public Map<String,Object> update(@PathVariable String leadId, @RequestBody(required = false) Map<String,String> body) {
        requireBody(body);
        return leads.update(leadId, actor(), body.get("assignedTo"), body.get("status"),
                body.get("followUpAt"), body.get("outcome"));
    }

    @GetMapping("/{leadId}/notes")
    public List<Map<String,Object>> notes(@PathVariable String leadId) {
        return leads.notes(leadId);
    }

    @PostMapping("/{leadId}/notes")
    public Map<String,Object> addNote(@PathVariable String leadId, @RequestBody(required = false) Map<String,String> body) {
        requireBody(body);
        return leads.addNote(leadId, actor(), body.get("note"), body.get("outcome"), body.get("followUpAt"));
    }

    private void requireBody(Map<String, String> body) {
        if (body == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
    }

    private String actor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity user)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Authenticated administrator identity is required");
        }
        return user.getUserId();
    }
}

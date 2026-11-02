package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SellerOnboardingLeadService {
    private final JdbcTemplate jdbc;
    private final OtpService otpService;
    private final SellerRegistrationOtpConfigService otpConfig;

    @Transactional
    public Map<String, Object> start(String ownerName, String rawEmail, String rawPhone) {
        String name = clean(ownerName, 150);
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase();
        String phone = rawPhone == null ? "" : rawPhone.replaceAll("\\D", "");
        validate(name, email, phone);
        String existing = jdbc.query(
                "SELECT LEAD_ID FROM SELLER_ONBOARDING_LEADS WHERE EMAIL=? AND PHONE=? AND STATUS NOT IN ('CONVERTED','NOT_INTERESTED') ORDER BY CREATED_AT DESC FETCH FIRST 1 ROWS ONLY",
                rs -> rs.next() ? rs.getString(1) : null, email, phone);
        if (existing != null) {
            jdbc.update("UPDATE SELLER_ONBOARDING_LEADS SET OWNER_NAME=?, UPDATED_AT=? WHERE LEAD_ID=?",
                    name, LocalDateTime.now(), existing);
            return Map.of("success", true, "leadId", existing, "status", "EXISTING");
        }
        String id = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        boolean emailRequired = otpConfig.emailEnabled();
        boolean phoneRequired = otpConfig.mobileEnabled();
        jdbc.update("INSERT INTO SELLER_ONBOARDING_LEADS (LEAD_ID,OWNER_NAME,EMAIL,PHONE,SOURCE,STATUS,EMAIL_VERIFIED,PHONE_VERIFIED,CONTACT_CONSENT,CALLBACK_REQUESTED,EMAIL_OTP_REQUIRED,PHONE_OTP_REQUIRED,EMAIL_OTP_SKIPPED,PHONE_OTP_SKIPPED,CREATED_AT,UPDATED_AT) VALUES (?,?,?,?,?,'STARTED',0,0,0,0,?,?,?,?,?,?)",
                id, name, email, phone, "SELLER_REGISTRATION",
                emailRequired ? 1 : 0, phoneRequired ? 1 : 0,
                emailRequired ? 0 : 1, phoneRequired ? 0 : 1, now, now);
        audit(id, "APPLICANT", "LEAD_CREATED", "Registration contact details captured");
        return Map.of("success", true, "leadId", id, "status", "STARTED");
    }

    public Map<String, Object> sendContactOtps(String leadId) {
        Map<String,Object> lead = getLead(leadId);
        boolean emailRequired = Boolean.TRUE.equals(lead.get("emailOtpRequired"));
        boolean phoneRequired = Boolean.TRUE.equals(lead.get("phoneOtpRequired"));
        if (emailRequired) otpService.send(String.valueOf(lead.get("email")), "SELLER_EMAIL");
        if (phoneRequired) otpService.send(String.valueOf(lead.get("phone")), "SELLER_PHONE");
        return Map.of("success", true, "emailOtpRequired", emailRequired, "mobileOtpRequired", phoneRequired,
                "expiresInSeconds", 600, "resendAfterSeconds", otpService.getResendCooldownSeconds());
    }

    @Transactional
    public Map<String, Object> verifyContact(String leadId, String emailOtp, String phoneOtp) {
        Map<String, Object> lead = getLead(leadId);
        String email = String.valueOf(lead.get("email"));
        String phone = String.valueOf(lead.get("phone"));
        boolean emailRequired = Boolean.TRUE.equals(lead.get("emailOtpRequired"));
        boolean phoneRequired = Boolean.TRUE.equals(lead.get("phoneOtpRequired"));
        if (emailRequired) otpService.verify(email, "SELLER_EMAIL", emailOtp);
        if (phoneRequired) otpService.verify(phone, "SELLER_PHONE", phoneOtp);
        LocalDateTime now = LocalDateTime.now();
        jdbc.update("UPDATE SELLER_ONBOARDING_LEADS SET EMAIL_VERIFIED=?, PHONE_VERIFIED=?, EMAIL_OTP_SKIPPED=?, PHONE_OTP_SKIPPED=?, STATUS='CONTACT_VERIFIED', UPDATED_AT=? WHERE LEAD_ID=?",
                emailRequired ? 1 : 0, phoneRequired ? 1 : 0,
                emailRequired ? 0 : 1, phoneRequired ? 0 : 1, now, leadId);
        audit(leadId, "APPLICANT", "CONTACT_VERIFICATION_COMPLETED",
                "email=" + (emailRequired ? "VERIFIED" : "OTP_NOT_REQUIRED") + "; mobile=" + (phoneRequired ? "VERIFIED" : "OTP_NOT_REQUIRED"));
        return Map.of("success", true, "leadId", leadId, "status", "CONTACT_VERIFIED");
    }

    @Transactional
    public Map<String, Object> requestCallback(String leadId, boolean consent, String preferredTime) {
        if (!consent) throw new ApiException(HttpStatus.BAD_REQUEST, "Please provide consent before requesting a callback");
        Map<String, Object> lead = getLead(leadId);
        if (!contactRequirementSatisfied(lead, "email") || !contactRequirementSatisfied(lead, "phone")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Complete the enabled contact verification steps before requesting a callback");
        }
        LocalDateTime now = LocalDateTime.now();
        jdbc.update("UPDATE SELLER_ONBOARDING_LEADS SET CONTACT_CONSENT=1, CONTACT_CONSENT_AT=?, CONTACT_CONSENT_VERSION='SELLER-CALLBACK-2026-11', CALLBACK_REQUESTED=1, STATUS='CALLBACK_REQUESTED', UPDATED_AT=? WHERE LEAD_ID=?",
                now, now, leadId);
        audit(leadId, "APPLICANT", "CALLBACK_REQUESTED", clean(preferredTime, 120));
        return Map.of("success", true, "message", "KuraliUpdates will contact you during the requested time");
    }

    @Transactional
    public void markApplicationSubmitted(String leadId, String email, String phone, String applicationId) {
        if (leadId == null || leadId.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Verified seller registration reference is required");
        }
        Map<String, Object> lead = getLead(leadId);
        if (!email.equalsIgnoreCase(String.valueOf(lead.get("email"))) || !phone.equals(String.valueOf(lead.get("phone")))) {
            throw new ApiException(HttpStatus.CONFLICT, "Registration reference does not match the verified contact details");
        }
        if (!contactRequirementSatisfied(lead, "email") || !contactRequirementSatisfied(lead, "phone")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Complete the enabled contact verification steps before submitting seller details");
        }
        if (!List.of("CONTACT_VERIFIED", "CALLBACK_REQUESTED").contains(String.valueOf(lead.get("status")))) {
            throw new ApiException(HttpStatus.CONFLICT, "This registration lead has already been submitted or closed");
        }
        jdbc.update("UPDATE SELLER_ONBOARDING_LEADS SET STATUS='APPLICATION_SUBMITTED', APPLICATION_ID=?, UPDATED_AT=? WHERE LEAD_ID=?",
                applicationId, LocalDateTime.now(), leadId);
        audit(leadId, "APPLICANT", "APPLICATION_SUBMITTED", "Seller application " + applicationId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(String status, String search, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(100, size));
        String normalizedStatus = status == null ? "" : status.trim().toUpperCase();
        String term = search == null ? "" : search.trim().toLowerCase();
        StringBuilder sql = new StringBuilder("SELECT LEAD_ID,OWNER_NAME,EMAIL,PHONE,SOURCE,STATUS,EMAIL_VERIFIED,PHONE_VERIFIED,EMAIL_OTP_REQUIRED,PHONE_OTP_REQUIRED,EMAIL_OTP_SKIPPED,PHONE_OTP_SKIPPED,CONTACT_CONSENT,CALLBACK_REQUESTED,ASSIGNED_TO,CALLBACK_AT,LAST_CONTACTED_AT,APPLICATION_ID,CREATED_AT,UPDATED_AT FROM SELLER_ONBOARDING_LEADS WHERE 1=1");
        java.util.List<Object> params = new java.util.ArrayList<>();
        if (!normalizedStatus.isBlank()) { sql.append(" AND STATUS=?"); params.add(normalizedStatus); }
        if (!term.isBlank()) {
            sql.append(" AND (LOWER(OWNER_NAME) LIKE ? OR LOWER(EMAIL) LIKE ? OR PHONE LIKE ?)");
            String pattern = "%" + term + "%";
            params.add(pattern); params.add(pattern); params.add(pattern);
        }
        sql.append(" ORDER BY CASE WHEN STATUS='CALLBACK_REQUESTED' THEN 0 ELSE 1 END, CREATED_AT DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY");
        params.add(safePage * safeSize); params.add(safeSize);
        return jdbc.query(sql.toString(), (rs, row) -> {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("leadId", rs.getString("LEAD_ID")); m.put("ownerName", rs.getString("OWNER_NAME"));
            m.put("email", rs.getString("EMAIL")); m.put("phone", rs.getString("PHONE"));
            m.put("source", rs.getString("SOURCE")); m.put("status", rs.getString("STATUS"));
            m.put("emailVerified", rs.getInt("EMAIL_VERIFIED") == 1); m.put("phoneVerified", rs.getInt("PHONE_VERIFIED") == 1);
            m.put("emailOtpRequired", rs.getInt("EMAIL_OTP_REQUIRED") == 1); m.put("phoneOtpRequired", rs.getInt("PHONE_OTP_REQUIRED") == 1);
            m.put("emailOtpSkipped", rs.getInt("EMAIL_OTP_SKIPPED") == 1); m.put("phoneOtpSkipped", rs.getInt("PHONE_OTP_SKIPPED") == 1);
            m.put("contactConsent", rs.getInt("CONTACT_CONSENT") == 1); m.put("callbackRequested", rs.getInt("CALLBACK_REQUESTED") == 1);
            m.put("assignedTo", rs.getString("ASSIGNED_TO")); m.put("callbackAt", rs.getTimestamp("CALLBACK_AT"));
            m.put("lastContactedAt", rs.getTimestamp("LAST_CONTACTED_AT")); m.put("applicationId", rs.getString("APPLICATION_ID"));
            m.put("createdAt", rs.getTimestamp("CREATED_AT")); m.put("updatedAt", rs.getTimestamp("UPDATED_AT"));
            return m;
        }, params.toArray());
    }

    @Transactional
    public Map<String, Object> update(String leadId, String actor, String assignee, String status, String followUpAt, String outcome) {
        getLead(leadId);
        String nextStatus = status == null || status.isBlank() ? null : status.trim().toUpperCase();
        if (nextStatus != null && !List.of("STARTED","CONTACT_VERIFIED","CALLBACK_REQUESTED","IN_PROGRESS","APPLICATION_SUBMITTED","CONVERTED","NOT_INTERESTED","UNREACHABLE").contains(nextStatus)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported lead status");
        }
        LocalDateTime followUp = null;
        if (followUpAt != null && !followUpAt.isBlank()) {
            try { followUp = LocalDateTime.parse(followUpAt); }
            catch (Exception ex) { throw new ApiException(HttpStatus.BAD_REQUEST, "Follow-up time must use ISO local date-time format"); }
        }
        java.util.List<String> assignments = new java.util.ArrayList<>();
        java.util.List<Object> params = new java.util.ArrayList<>();
        if (assignee != null && !assignee.isBlank()) { assignments.add("ASSIGNED_TO=?"); params.add(clean(assignee,150)); }
        if (nextStatus != null) { assignments.add("STATUS=?"); params.add(nextStatus); }
        if (followUp != null) { assignments.add("CALLBACK_AT=?"); params.add(followUp); }
        if (outcome != null && !outcome.isBlank()) { assignments.add("LAST_CONTACTED_AT=?"); params.add(LocalDateTime.now()); }
        if (!assignments.isEmpty()) {
            assignments.add("UPDATED_AT=?"); params.add(LocalDateTime.now()); params.add(leadId);
            jdbc.update("UPDATE SELLER_ONBOARDING_LEADS SET " + String.join(",", assignments) + " WHERE LEAD_ID=?", params.toArray());
        }
        if (outcome != null && !outcome.isBlank()) addNote(leadId, actor, outcome, nextStatus, followUpAt);
        audit(leadId, actor, "LEAD_UPDATED", "status=" + nextStatus + "; assignee=" + assignee + "; followUp=" + followUpAt);
        return getLead(leadId);
    }

    @Transactional
    public Map<String, Object> addNote(String leadId, String actor, String note, String outcome, String followUpAt) {
        getLead(leadId);
        String safeNote = clean(note, 2000);
        if (safeNote.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "A call note is required");
        LocalDateTime followUp = null;
        if (followUpAt != null && !followUpAt.isBlank()) {
            try { followUp = LocalDateTime.parse(followUpAt); }
            catch (Exception ex) { throw new ApiException(HttpStatus.BAD_REQUEST, "Follow-up time must use ISO local date-time format"); }
        }
        jdbc.update("INSERT INTO SELLER_ONBOARDING_LEAD_NOTES (NOTE_ID,LEAD_ID,AUTHOR,NOTE_TEXT,OUTCOME,FOLLOW_UP_AT,CREATED_AT) VALUES (?,?,?,?,?,?,?)",
                UUID.randomUUID().toString(), leadId, clean(actor,150), safeNote, blankToNull(outcome), followUp, LocalDateTime.now());
        audit(leadId, actor, "NOTE_ADDED", outcome);
        return Map.of("success", true);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> notes(String leadId) {
        getLead(leadId);
        return jdbc.query("SELECT NOTE_ID,AUTHOR,NOTE_TEXT,OUTCOME,FOLLOW_UP_AT,CREATED_AT FROM SELLER_ONBOARDING_LEAD_NOTES WHERE LEAD_ID=? ORDER BY CREATED_AT DESC",
                (rs,row)->Map.of("noteId",rs.getString("NOTE_ID"),"author",rs.getString("AUTHOR"),"note",rs.getString("NOTE_TEXT"),
                        "outcome",rs.getString("OUTCOME")==null?"":rs.getString("OUTCOME"),
                        "followUpAt",rs.getTimestamp("FOLLOW_UP_AT")==null?"":rs.getTimestamp("FOLLOW_UP_AT").toString(),
                        "createdAt",rs.getTimestamp("CREATED_AT").toString()), leadId);
    }

    private Map<String,Object> getLead(String id) {
        if (id == null || id.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Lead reference is required");
        List<Map<String,Object>> rows = jdbc.query("SELECT LEAD_ID,OWNER_NAME,EMAIL,PHONE,EMAIL_VERIFIED,PHONE_VERIFIED,EMAIL_OTP_REQUIRED,PHONE_OTP_REQUIRED,EMAIL_OTP_SKIPPED,PHONE_OTP_SKIPPED,CONTACT_CONSENT,STATUS,ASSIGNED_TO,CALLBACK_AT FROM SELLER_ONBOARDING_LEADS WHERE LEAD_ID=?",
                (rs,row)->Map.of("leadId",rs.getString("LEAD_ID"),"ownerName",rs.getString("OWNER_NAME"),
                        "email",rs.getString("EMAIL"),"phone",rs.getString("PHONE"),
                        "emailVerified",rs.getInt("EMAIL_VERIFIED")==1,"phoneVerified",rs.getInt("PHONE_VERIFIED")==1,
                        "emailOtpRequired",rs.getInt("EMAIL_OTP_REQUIRED")==1,"phoneOtpRequired",rs.getInt("PHONE_OTP_REQUIRED")==1,
                        "emailOtpSkipped",rs.getInt("EMAIL_OTP_SKIPPED")==1,"phoneOtpSkipped",rs.getInt("PHONE_OTP_SKIPPED")==1,
                        "contactConsent",rs.getInt("CONTACT_CONSENT")==1,"status",rs.getString("STATUS"),"assignedTo",rs.getString("ASSIGNED_TO")==null?"":rs.getString("ASSIGNED_TO"),"callbackAt",rs.getTimestamp("CALLBACK_AT")==null?"":rs.getTimestamp("CALLBACK_AT").toString()), id);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Seller registration lead was not found");
        return rows.get(0);
    }

    private void audit(String leadId, String actor, String action, String details) {
        jdbc.update("INSERT INTO SELLER_ONBOARDING_LEAD_AUDIT (AUDIT_ID,LEAD_ID,ACTOR,ACTION,DETAILS,CREATED_AT) VALUES (?,?,?,?,?,?)",
                UUID.randomUUID().toString(), leadId, clean(actor,150), action, clean(details,2000), LocalDateTime.now());
    }

    private boolean contactRequirementSatisfied(Map<String,Object> lead, String channel) {
        return Boolean.TRUE.equals(lead.get(channel + "Verified")) || Boolean.TRUE.equals(lead.get(channel + "OtpSkipped"));
    }

    private void validate(String name, String email, String phone) {
        if (name.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Owner name is required");
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid email address");
        if (!phone.matches("\\d{10}")) throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid 10-digit mobile number");
    }
    private String clean(String value, int max) { if (value == null) return ""; String v=value.trim(); return v.length()>max?v.substring(0,max):v; }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}

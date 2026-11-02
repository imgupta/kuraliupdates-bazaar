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
        jdbc.update("INSERT INTO SELLER_ONBOARDING_LEADS (LEAD_ID,OWNER_NAME,EMAIL,PHONE,SOURCE,STATUS,EMAIL_VERIFIED,PHONE_VERIFIED,CONTACT_CONSENT,CALLBACK_REQUESTED,CREATED_AT,UPDATED_AT) VALUES (?,?,?,?,?,'STARTED',0,0,0,0,?,?)",
                id, name, email, phone, "SELLER_REGISTRATION", now, now);
        audit(id, "APPLICANT", "LEAD_CREATED", "Registration contact details captured");
        return Map.of("success", true, "leadId", id, "status", "STARTED");
    }

    @Transactional
    public Map<String, Object> verifyContact(String leadId, String emailOtp, String phoneOtp) {
        Map<String, Object> lead = getLead(leadId);
        String email = String.valueOf(lead.get("email"));
        String phone = String.valueOf(lead.get("phone"));
        otpService.verify(email, "EMAIL", emailOtp);
        otpService.verify(phone, "PHONE", phoneOtp);
        LocalDateTime now = LocalDateTime.now();
        jdbc.update("UPDATE SELLER_ONBOARDING_LEADS SET EMAIL_VERIFIED=1, PHONE_VERIFIED=1, STATUS='CONTACT_VERIFIED', UPDATED_AT=? WHERE LEAD_ID=?",
                now, leadId);
        audit(leadId, "APPLICANT", "CONTACT_VERIFIED", "Email and mobile OTP verified");
        return Map.of("success", true, "leadId", leadId, "status", "CONTACT_VERIFIED");
    }

    @Transactional
    public Map<String, Object> requestCallback(String leadId, boolean consent, String preferredTime) {
        if (!consent) throw new ApiException(HttpStatus.BAD_REQUEST, "Please provide consent before requesting a callback");
        Map<String, Object> lead = getLead(leadId);
        if (!Boolean.TRUE.equals(lead.get("emailVerified")) || !Boolean.TRUE.equals(lead.get("phoneVerified"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Verify your email and mobile before requesting a callback");
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
        if (!Boolean.TRUE.equals(lead.get("emailVerified")) || !Boolean.TRUE.equals(lead.get("phoneVerified"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Verify both email and mobile before submitting seller details");
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
        String term = search == null ? "" : "%" + search.trim().toLowerCase() + "%";
        return jdbc.query(
                "SELECT LEAD_ID,OWNER_NAME,EMAIL,PHONE,SOURCE,STATUS,EMAIL_VERIFIED,PHONE_VERIFIED,CONTACT_CONSENT,CALLBACK_REQUESTED,ASSIGNED_TO,CALLBACK_AT,LAST_CONTACTED_AT,APPLICATION_ID,CREATED_AT,UPDATED_AT FROM SELLER_ONBOARDING_LEADS WHERE (? IS NULL OR STATUS=?) AND (? IS NULL OR LOWER(OWNER_NAME) LIKE ? OR LOWER(EMAIL) LIKE ? OR PHONE LIKE ?) ORDER BY CASE WHEN STATUS='CALLBACK_REQUESTED' THEN 0 ELSE 1 END, CREATED_AT DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",
                (rs, row) -> {
                    Map<String,Object> m = new LinkedHashMap<>();
                    m.put("leadId", rs.getString("LEAD_ID")); m.put("ownerName", rs.getString("OWNER_NAME"));
                    m.put("email", rs.getString("EMAIL")); m.put("phone", rs.getString("PHONE"));
                    m.put("source", rs.getString("SOURCE")); m.put("status", rs.getString("STATUS"));
                    m.put("emailVerified", rs.getInt("EMAIL_VERIFIED") == 1); m.put("phoneVerified", rs.getInt("PHONE_VERIFIED") == 1);
                    m.put("contactConsent", rs.getInt("CONTACT_CONSENT") == 1); m.put("callbackRequested", rs.getInt("CALLBACK_REQUESTED") == 1);
                    m.put("assignedTo", rs.getString("ASSIGNED_TO")); m.put("callbackAt", rs.getTimestamp("CALLBACK_AT"));
                    m.put("lastContactedAt", rs.getTimestamp("LAST_CONTACTED_AT")); m.put("applicationId", rs.getString("APPLICATION_ID"));
                    m.put("createdAt", rs.getTimestamp("CREATED_AT")); m.put("updatedAt", rs.getTimestamp("UPDATED_AT"));
                    return m;
                },
                normalizedStatus.isBlank() ? null : normalizedStatus,
                normalizedStatus.isBlank() ? null : normalizedStatus,
                term.equals("%%") ? null : term, term.equals("%%") ? null : term,
                term.equals("%%") ? null : term, term.equals("%%") ? null : term,
                safePage * safeSize, safeSize);
    }

    @Transactional
    public Map<String, Object> update(String leadId, String actor, String assignee, String status, String followUpAt, String outcome) {
        getLead(leadId);
        String nextStatus = status == null || status.isBlank() ? null : status.trim().toUpperCase();
        if (nextStatus != null && !List.of("CONTACT_VERIFIED","CALLBACK_REQUESTED","IN_PROGRESS","APPLICATION_SUBMITTED","CONVERTED","NOT_INTERESTED","UNREACHABLE").contains(nextStatus)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported lead status");
        }
        LocalDateTime followUp = null;
        if (followUpAt != null && !followUpAt.isBlank()) {
            try { followUp = LocalDateTime.parse(followUpAt); }
            catch (Exception ex) { throw new ApiException(HttpStatus.BAD_REQUEST, "Follow-up time must use ISO local date-time format"); }
        }
        jdbc.update("UPDATE SELLER_ONBOARDING_LEADS SET ASSIGNED_TO=COALESCE(?,ASSIGNED_TO), STATUS=COALESCE(?,STATUS), CALLBACK_AT=COALESCE(?,CALLBACK_AT), LAST_CONTACTED_AT=?, UPDATED_AT=? WHERE LEAD_ID=?",
                blankToNull(assignee), nextStatus, followUp, LocalDateTime.now(), LocalDateTime.now(), leadId);
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
        List<Map<String,Object>> rows = jdbc.query("SELECT LEAD_ID,OWNER_NAME,EMAIL,PHONE,EMAIL_VERIFIED,PHONE_VERIFIED,CONTACT_CONSENT,STATUS,ASSIGNED_TO,CALLBACK_AT FROM SELLER_ONBOARDING_LEADS WHERE LEAD_ID=?",
                (rs,row)->Map.of("leadId",rs.getString("LEAD_ID"),"ownerName",rs.getString("OWNER_NAME"),
                        "email",rs.getString("EMAIL"),"phone",rs.getString("PHONE"),
                        "emailVerified",rs.getInt("EMAIL_VERIFIED")==1,"phoneVerified",rs.getInt("PHONE_VERIFIED")==1,
                        "contactConsent",rs.getInt("CONTACT_CONSENT")==1,"status",rs.getString("STATUS"),"assignedTo",rs.getString("ASSIGNED_TO")==null?"":rs.getString("ASSIGNED_TO"),"callbackAt",rs.getTimestamp("CALLBACK_AT")==null?"":rs.getTimestamp("CALLBACK_AT").toString()), id);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Seller registration lead was not found");
        return rows.get(0);
    }

    private void audit(String leadId, String actor, String action, String details) {
        jdbc.update("INSERT INTO SELLER_ONBOARDING_LEAD_AUDIT (AUDIT_ID,LEAD_ID,ACTOR,ACTION,DETAILS,CREATED_AT) VALUES (?,?,?,?,?,?)",
                UUID.randomUUID().toString(), leadId, clean(actor,150), action, clean(details,2000), LocalDateTime.now());
    }

    private void validate(String name, String email, String phone) {
        if (name.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Owner name is required");
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid email address");
        if (!phone.matches("\\d{10}")) throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a valid 10-digit mobile number");
    }
    private String clean(String value, int max) { if (value == null) return ""; String v=value.trim(); return v.length()>max?v.substring(0,max):v; }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}

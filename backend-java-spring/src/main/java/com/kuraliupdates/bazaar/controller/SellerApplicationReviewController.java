package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

/** Admin-only review actions for shared seller applications and their quarantined documents. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/seller-applications")
public class SellerApplicationReviewController {
    private final JdbcTemplate jdbc;

    @GetMapping("/{id}/audit")
    public List<Map<String,Object>> audit(@PathVariable String id) {
        requireApplication(id);
        return jdbc.query("SELECT ACTOR,ACTION,DETAILS,CREATED_AT FROM SELLER_APPLICATION_AUDIT WHERE APPLICATION_ID=? ORDER BY CREATED_AT DESC FETCH FIRST 200 ROWS ONLY",
                (rs,n) -> {
                    Map<String,Object> row = new LinkedHashMap<>();
                    row.put("actor",rs.getString(1)); row.put("action",rs.getString(2));
                    row.put("details",rs.getString(3)); row.put("createdAt",rs.getTimestamp(4));
                    return row;
                }, id);
    }

    @PatchMapping("/{id}/assignment")
    public Map<String,Object> assign(@PathVariable String id, @RequestBody Map<String,String> body, Authentication auth) {
        requireApplication(id);
        String assignee = body == null ? null : body.get("assignedTo");
        if (assignee != null) assignee = assignee.trim();
        if (assignee != null && !assignee.isBlank()) {
            Integer activeAdmin = jdbc.queryForObject("SELECT COUNT(*) FROM USERS WHERE USER_ID=? AND IS_ADMIN=1 AND ACCOUNT_STATUS='ACTIVE'",Integer.class,assignee);
            if (activeAdmin == null || activeAdmin == 0)
                throw new ApiException(HttpStatus.BAD_REQUEST,"Choose an active administrator from the assignment list");
        }
        String assignedUserId = assignee == null || assignee.isBlank() ? null : assignee;
        jdbc.update("UPDATE SELLER_APPLICATIONS SET ASSIGNED_TO=?,UPDATED_AT=? WHERE APPLICATION_ID=?",
                assignedUserId, LocalDateTime.now(), id);
        record(id,auth.getName(),"ASSIGNMENT_CHANGED",assignedUserId == null ? "Assignment cleared" : "Assigned to administrator " + assignedUserId);
        Map<String,Object> result = new LinkedHashMap<>();
        result.put("applicationId",id); result.put("assignedTo",assignedUserId);
        return result;
    }

    @PatchMapping("/{id}/documents/{documentId}/review")
    public Map<String,Object> reviewDocument(@PathVariable String id, @PathVariable String documentId,
                                              @RequestBody Map<String,String> body, Authentication auth) {
        String decision = body == null ? "" : Objects.toString(body.get("decision"),"").trim().toUpperCase(Locale.ROOT);
        String reason = body == null ? null : body.get("reason");
        if (!Set.of("VERIFIED","REJECTED").contains(decision))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Decision must be VERIFIED or REJECTED");
        if ("REJECTED".equals(decision) && (reason == null || reason.isBlank()))
            throw new ApiException(HttpStatus.BAD_REQUEST,"A correction reason is required when rejecting a document");
        if (reason != null && reason.length() > 1000)
            throw new ApiException(HttpStatus.BAD_REQUEST,"Correction reason must be 1000 characters or fewer");
        List<String> scan = jdbc.query("SELECT SCAN_STATUS FROM SELLER_APPLICATION_DOCUMENTS WHERE DOCUMENT_ID=? AND APPLICATION_ID=?",
                (rs,n) -> rs.getString(1), documentId,id);
        if (scan.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"Application document not found");
        if ("VERIFIED".equals(decision) && !"CLEAN".equals(scan.get(0)))
            throw new ApiException(HttpStatus.CONFLICT,"Only malware-scanned clean documents can be verified");
        jdbc.update("UPDATE SELLER_APPLICATION_DOCUMENTS SET VERIFICATION_STATUS=?,REJECTION_REASON=? WHERE DOCUMENT_ID=? AND APPLICATION_ID=?",
                decision,"REJECTED".equals(decision) ? reason.trim() : null,documentId,id);
        record(id,auth.getName(),"DOCUMENT_"+decision,documentId + ("REJECTED".equals(decision) ? ": " + reason.trim() : ""));
        Map<String,Object> result = new LinkedHashMap<>();
        result.put("documentId",documentId); result.put("verificationStatus",decision);
        result.put("rejectionReason","REJECTED".equals(decision) ? reason.trim() : null);
        return result;
    }

    @GetMapping("/{id}/documents/{documentId}/download")
    public ResponseEntity<byte[]> download(@PathVariable String id, @PathVariable String documentId) {
        List<Map<String,Object>> files = jdbc.query(
                "SELECT FILE_NAME,CONTENT_TYPE,DOCUMENT_DATA,SCAN_STATUS FROM SELLER_APPLICATION_DOCUMENTS WHERE DOCUMENT_ID=? AND APPLICATION_ID=?",
                (rs,n) -> {
                    Map<String,Object> row = new HashMap<>();
                    row.put("name",rs.getString(1)); row.put("type",rs.getString(2));
                    row.put("data",rs.getBytes(3)); row.put("scan",rs.getString(4)); return row;
                }, documentId,id);
        if (files.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"Application document not found");
        Map<String,Object> file = files.get(0);
        if (!"CLEAN".equals(file.get("scan")))
            throw new ApiException(HttpStatus.CONFLICT,"Document is quarantined because it has not passed malware scanning");
        String name = Objects.toString(file.get("name"),"document").replaceAll("[\\r\\n\\\"]","_");
        MediaType type;
        try { type = MediaType.parseMediaType(Objects.toString(file.get("type"),MediaType.APPLICATION_OCTET_STREAM_VALUE)); }
        catch (Exception ignored) { type = MediaType.APPLICATION_OCTET_STREAM; }
        return ResponseEntity.ok().contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(name, StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options","nosniff")
                .body((byte[])file.get("data"));
    }

    private void requireApplication(String id) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM SELLER_APPLICATIONS WHERE APPLICATION_ID=?",Integer.class,id);
        if (count == null || count == 0) throw new ApiException(HttpStatus.NOT_FOUND,"Seller application not found");
    }
    private void record(String id,String actor,String action,String details) {
        jdbc.update("INSERT INTO SELLER_APPLICATION_AUDIT (AUDIT_ID,APPLICATION_ID,ACTOR,ACTION,DETAILS,CREATED_AT) VALUES (?,?,?,?,?,?)",
                "saud-" + UUID.randomUUID(),id,actor,action,details,LocalDateTime.now());
    }
}

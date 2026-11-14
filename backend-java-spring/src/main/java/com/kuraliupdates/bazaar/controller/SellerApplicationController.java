package com.kuraliupdates.bazaar.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.MalwareScanner;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.SellerOnboardingLeadService;
import org.springframework.transaction.annotation.Transactional;
import com.kuraliupdates.bazaar.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class SellerApplicationController {
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Set<String> TYPES = Set.of("GST_CERTIFICATE", "FSSAI_CERTIFICATE",
            "SHOP_FRONT_PHOTO", "SHOP_INTERIOR_PHOTO", "TRADE_LICENSE", "UDYAM_CERTIFICATE");
    private static final Set<String> MIMES = Set.of("application/pdf", "image/jpeg", "image/png");
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final MalwareScanner scanner;
    private final AuthService authService;
    private final SellerOnboardingLeadService sellerLeads;


    /** Authenticated seller entry point for the shared CRM/self-service application. */
    @PostMapping("/seller-applications/self")
    public Map<String,Object> createOrResumeSelf(@RequestHeader(value="Authorization", required=false) String authorization,
                                                  @RequestBody Map<String,Object> body) {
        String bearer = authorization != null && authorization.startsWith("Bearer ")
                ? authorization.substring(7).trim() : null;
        UserEntity user = authService.requireUser(bearer);
        if (!"SELLER".equalsIgnoreCase(authService.requireSessionRole(bearer)))
            throw new ApiException(HttpStatus.FORBIDDEN,"An active seller session is required");
        Map<String,Object> details = new LinkedHashMap<>(body == null ? Map.of() : body);
        details.put("ownerName", text(details,"ownerName").isBlank() ? user.getName() : text(details,"ownerName"));
        details.put("email", user.getEmail());
        details.put("phone", user.getPhone());
        validate(details);
        String id;
        List<Map<String,String>> existing = jdbc.query(
                "SELECT APPLICATION_ID,STATUS FROM SELLER_APPLICATIONS WHERE SELLER_USER_ID=?",
                (rs,n) -> Map.of("id",rs.getString(1),"status",rs.getString(2)), user.getUserId());
        String accessToken = UUID.randomUUID().toString() + UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        if (!existing.isEmpty()) {
            id = existing.get(0).get("id");
            if (!Set.of("DRAFT","IN_PROGRESS","ACTION_REQUIRED").contains(existing.get(0).get("status")))
                throw new ApiException(HttpStatus.CONFLICT,"Your seller application has already been submitted and is read-only");
            jdbc.update("UPDATE SELLER_APPLICATIONS SET OWNER_NAME=?,EMAIL=?,PHONE=?,SHOP_NAME=?,APPLICATION_JSON=?,STATUS='IN_PROGRESS',ACCESS_TOKEN_HASH=?,ACCESS_TOKEN_EXPIRES_AT=?,UPDATED_AT=? WHERE APPLICATION_ID=?",
                    text(details,"ownerName"),text(details,"email").toLowerCase(Locale.ROOT),
                    text(details,"phone").replaceAll("\\D",""),text(details,"shopName"),json(details),
                    hash(accessToken),now.plusDays(30),now,id);
            audit(id,user.getUserId(),"SELLER_APPLICATION_RESUMED","Seller resumed the shared application");
        } else {
            id = "sapp-" + UUID.randomUUID();
            jdbc.update("INSERT INTO SELLER_APPLICATIONS (APPLICATION_ID,SELLER_USER_ID,OWNER_NAME,EMAIL,PHONE,SHOP_NAME,STATUS,APPLICATION_JSON,ACCESS_TOKEN_HASH,ACCESS_TOKEN_EXPIRES_AT,CREATED_BY,CREATED_AT,UPDATED_AT) VALUES (?,?,?,?,?,?,'IN_PROGRESS',?,?,?,?,?,?)",
                    id,user.getUserId(),text(details,"ownerName"),text(details,"email").toLowerCase(Locale.ROOT),
                    text(details,"phone").replaceAll("\\D",""),text(details,"shopName"),json(details),
                    hash(accessToken),now.plusDays(30),user.getUserId(),now,now);
            audit(id,user.getUserId(),"APPLICATION_CREATED","Seller created shared application after contact verification");
        }
        return Map.of("applicationId",id,"status","IN_PROGRESS","sellerAccessToken",accessToken);
    }

    @GetMapping("/admin/seller-applications")
    public List<Map<String,Object>> list(@RequestParam(required=false) String search,
                                         @RequestParam(required=false) String status) {
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String state = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        StringBuilder sql = new StringBuilder("SELECT APPLICATION_ID,OWNER_NAME,EMAIL,PHONE,SHOP_NAME,STATUS,ASSIGNED_TO,UPDATED_AT FROM SELLER_APPLICATIONS WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (!state.isBlank()) { sql.append(" AND STATUS=?"); args.add(state); }
        if (!term.isBlank()) {
            sql.append(" AND (LOWER(OWNER_NAME) LIKE ? OR LOWER(EMAIL) LIKE ? OR LOWER(SHOP_NAME) LIKE ?)");
            String pattern = like(term);
            args.add(pattern); args.add(pattern); args.add(pattern);
        }
        sql.append(" ORDER BY UPDATED_AT DESC FETCH FIRST 200 ROWS ONLY");
        return jdbc.query(sql.toString(), (rs,n) -> {
            Map<String,Object> row = new LinkedHashMap<>();
            row.put("applicationId",rs.getString(1)); row.put("ownerName",rs.getString(2));
            row.put("email",rs.getString(3)); row.put("phone",rs.getString(4));
            row.put("shopName",rs.getString(5)); row.put("status",rs.getString(6));
            row.put("assignedTo",rs.getString(7)); row.put("updatedAt",rs.getTimestamp(8));
            return row;
        }, args.toArray());
    }

    @PostMapping("/admin/seller-applications")
    public Map<String,Object> create(@RequestBody Map<String,Object> body, Authentication auth) {
        requireAdmin(auth);
        validate(body);
        body.remove("agreementAccepted");
        String id = "sapp-" + UUID.randomUUID();
        String accessToken = UUID.randomUUID().toString() + UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        jdbc.update("INSERT INTO SELLER_APPLICATIONS (APPLICATION_ID,OWNER_NAME,EMAIL,PHONE,SHOP_NAME,STATUS,APPLICATION_JSON,ACCESS_TOKEN_HASH,ACCESS_TOKEN_EXPIRES_AT,CREATED_BY,CREATED_AT,UPDATED_AT) VALUES (?,?,?,?,?,'DRAFT',?,?,?,?,?,?)",
                id, text(body,"ownerName"), text(body,"email").toLowerCase(Locale.ROOT),
                text(body,"phone").replaceAll("\\D",""), text(body,"shopName"), json(body),
                hash(accessToken), now.plusDays(30), auth.getName(), now, now);
        audit(id, auth.getName(), "APPLICATION_CREATED", "CRM created application");
        return Map.of("applicationId",id,"status","DRAFT","sellerAccessToken",accessToken,
                "message","Copy this secure continuation token now. It is not stored in readable form.");
    }

    @GetMapping("/admin/seller-applications/{id}")
    public Map<String,Object> get(@PathVariable String id, Authentication auth) {
        requireAdmin(auth);
        return read(id, false);
    }

    @PutMapping("/admin/seller-applications/{id}")
    public Map<String,Object> update(@PathVariable String id, @RequestBody Map<String,Object> body, Authentication auth) {
        requireAdmin(auth);
        Map<String,Object> current = read(id, false);
        Map<String,Object> merged = new LinkedHashMap<>((Map<String,Object>) current.get("details"));
        merged.putAll(body);
        merged.put("agreementAccepted", Boolean.FALSE);
        ensureVerifiedContactsUnchanged((Map<String,Object>) current.get("details"),merged);
        validate(merged);
        String next = "ACTION_REQUIRED".equals(current.get("status")) ? "IN_PROGRESS" : String.valueOf(current.get("status"));
        jdbc.update("UPDATE SELLER_APPLICATIONS SET OWNER_NAME=?,EMAIL=?,PHONE=?,SHOP_NAME=?,APPLICATION_JSON=?,STATUS=?,UPDATED_AT=? WHERE APPLICATION_ID=?",
                text(merged,"ownerName"), text(merged,"email").toLowerCase(Locale.ROOT),
                text(merged,"phone").replaceAll("\\D",""), text(merged,"shopName"), json(merged), next,
                LocalDateTime.now(), id);
        audit(id, auth.getName(), "APPLICATION_UPDATED", "CRM updated application details");
        return read(id, false);
    }

    @PutMapping("/seller-applications/{id}")
    public Map<String,Object> sellerUpdate(@PathVariable String id, @RequestHeader("X-Seller-Application-Token") String token,
                                          @RequestBody Map<String,Object> body) {
        Map<String,Object> current = read(id, true, token);
        if (Set.of("SUBMITTED","APPROVED","REJECTED").contains(String.valueOf(current.get("status"))))
            throw new ApiException(HttpStatus.CONFLICT,"This application is no longer editable");
        Map<String,Object> merged = new LinkedHashMap<>((Map<String,Object>) current.get("details"));
        merged.putAll(body);
        ensureVerifiedContactsUnchanged((Map<String,Object>) current.get("details"),merged);
        validate(merged);
        jdbc.update("UPDATE SELLER_APPLICATIONS SET OWNER_NAME=?,EMAIL=?,PHONE=?,SHOP_NAME=?,APPLICATION_JSON=?,STATUS='IN_PROGRESS',UPDATED_AT=? WHERE APPLICATION_ID=?",
                text(merged,"ownerName"),text(merged,"email").toLowerCase(Locale.ROOT),
                text(merged,"phone").replaceAll("\\D",""),text(merged,"shopName"),json(merged),LocalDateTime.now(),id);
        audit(id,"SELLER","SELLER_DETAILS_UPDATED","Seller updated application details");
        return read(id,true,token);
    }

    @GetMapping("/seller-applications/{id}")
    public Map<String,Object> sellerStatus(@PathVariable String id, @RequestHeader("X-Seller-Application-Token") String token) {
        return read(id,true,token);
    }

    @PostMapping(value="/admin/seller-applications/{id}/documents",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String,Object> adminUpload(@PathVariable String id,@RequestParam String documentType,
                                          @RequestParam MultipartFile file,Authentication auth) throws IOException {
        requireAdmin(auth);
        return upload(id,documentType,file,auth.getName());
    }

    @PostMapping(value="/seller-applications/{id}/documents",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String,Object> sellerUpload(@PathVariable String id,
             @RequestHeader("X-Seller-Application-Token") String token,@RequestParam String documentType,
             @RequestParam MultipartFile file) throws IOException {
        Map<String,Object> application = read(id,true,token);
        if (Set.of("SUBMITTED","UNDER_REVIEW","APPROVED","REJECTED").contains(String.valueOf(application.get("status"))))
            throw new ApiException(HttpStatus.CONFLICT,"Documents cannot be changed after submission");
        return upload(id,documentType,file,"SELLER");
    }

    @GetMapping("/admin/seller-applications/{id}/documents")
    public List<Map<String,Object>> documents(@PathVariable String id,Authentication auth) {
        requireAdmin(auth);
        return documentMetadata(id);
    }

    @GetMapping("/seller-applications/{id}/documents")
    public List<Map<String,Object>> sellerDocuments(@PathVariable String id,
             @RequestHeader("X-Seller-Application-Token") String token) {
        read(id,true,token);
        return documentMetadata(id);
    }

    @PostMapping("/admin/seller-applications/{id}/submit")
    @Transactional
    public Map<String,Object> submit(@PathVariable String id,Authentication auth) {
        requireAdmin(auth);
        return submitApplication(id,auth.getName(),false,null);
    }

    @PostMapping("/seller-applications/{id}/submit")
    @Transactional
    public Map<String,Object> sellerSubmit(@PathVariable String id,
             @RequestHeader("X-Seller-Application-Token") String token,
             @RequestBody Map<String,Object> body) {
        read(id,true,token);
        if (!Boolean.TRUE.equals(body.get("agreementAccepted")))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Seller must personally accept the seller agreement");
        return submitApplication(id,"SELLER",true,token);
    }

    @PatchMapping("/admin/seller-applications/{id}/status")
    @Transactional
    public Map<String,Object> status(@PathVariable String id,@RequestBody Map<String,String> body,Authentication auth) {
        requireAdmin(auth);
        String next = body == null ? "" : String.valueOf(body.getOrDefault("status","")).toUpperCase(Locale.ROOT);
        if (!Set.of("UNDER_REVIEW","ACTION_REQUIRED","APPROVED","REJECTED").contains(next))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Unsupported application status");
        String reason = body.get("reason");
        if (("ACTION_REQUIRED".equals(next)||"REJECTED".equals(next)) && (reason==null||reason.isBlank()))
            throw new ApiException(HttpStatus.BAD_REQUEST,"A reason is required for this status");
        Map<String,Object> current = read(id,false);
        String currentStatus = String.valueOf(current.get("status"));
        Map<String,Set<String>> transitions = Map.of(
                "SUBMITTED", Set.of("UNDER_REVIEW","ACTION_REQUIRED","REJECTED"),
                "UNDER_REVIEW", Set.of("ACTION_REQUIRED","APPROVED","REJECTED"),
                "ACTION_REQUIRED", Set.of("UNDER_REVIEW","REJECTED"),
                "APPROVED", Set.of(),
                "REJECTED", Set.of("ACTION_REQUIRED")
        );
        if (!transitions.getOrDefault(currentStatus,Set.of()).contains(next))
            throw new ApiException(HttpStatus.CONFLICT,"Invalid application status transition from " + currentStatus + " to " + next);
        if ("APPROVED".equals(next)) {
            Map<String,Object> details = (Map<String,Object>) current.get("details");
            List<Map<String,Object>> docs = documentMetadata(id);
            requireVerifiedDocument(docs,"SHOP_FRONT_PHOTO");
            if (!text(details,"gstNumber").isBlank()) requireVerifiedDocument(docs,"GST_CERTIFICATE");
            if (!text(details,"fssaiNumber").isBlank()) requireVerifiedDocument(docs,"FSSAI_CERTIFICATE");
        }
        jdbc.update("UPDATE SELLER_APPLICATIONS SET STATUS=?,STATUS_REASON=?,UPDATED_AT=? WHERE APPLICATION_ID=?",
                next,reason,LocalDateTime.now(),id);
        if ("APPROVED".equals(next)) {
            jdbc.update("UPDATE SELLER_ONBOARDING_LEADS SET STATUS='CONVERTED',UPDATED_AT=? WHERE APPLICATION_ID=? AND STATUS='APPLICATION_SUBMITTED'",
                    LocalDateTime.now(),id);
        }
        audit(id,auth.getName(),"STATUS_"+next,reason);
        return read(id,false);
    }

    private Map<String,Object> submitApplication(String id,String actor,boolean sellerAccepted,String token) {
        Map<String,Object> app = read(id,sellerAccepted, token);
        if (!"IN_PROGRESS".equals(app.get("status")) && !"DRAFT".equals(app.get("status")))
            throw new ApiException(HttpStatus.CONFLICT,"Application is not ready to submit");
        Map<String,Object> details = (Map<String,Object>) app.get("details");
        validate(details);
        if (!sellerAccepted && !Boolean.TRUE.equals(details.get("agreementAccepted")))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Seller must personally accept the seller agreement before submission");
        List<Map<String,Object>> docs = documentMetadata(id);
        requireCleanDocument(docs,"SHOP_FRONT_PHOTO");
        if (!text(details,"gstNumber").isBlank()) requireCleanDocument(docs,"GST_CERTIFICATE");
        if (!text(details,"fssaiNumber").isBlank()) requireCleanDocument(docs,"FSSAI_CERTIFICATE");
        String leadId = text(details,"leadId");
        if (sellerAccepted && leadId.isBlank())
            throw new ApiException(HttpStatus.FORBIDDEN,"A verified seller registration lead must be linked before submission");
        jdbc.update("UPDATE SELLER_APPLICATIONS SET STATUS='SUBMITTED',UPDATED_AT=? WHERE APPLICATION_ID=?",LocalDateTime.now(),id);
        if (!leadId.isBlank()) {
            sellerLeads.markApplicationSubmitted(leadId,text(details,"email").toLowerCase(Locale.ROOT),
                    text(details,"phone").replaceAll("\\D",""),id);
        }
        audit(id,actor,"APPLICATION_SUBMITTED","Submitted for admin review");
        return Map.of("applicationId",id,"status","SUBMITTED");
    }

    private Map<String,Object> upload(String id,String type,MultipartFile file,String actor) throws IOException {
        String normalized = type == null ? "" : type.trim().toUpperCase(Locale.ROOT);
        String mime = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        if (!TYPES.contains(normalized)) throw new ApiException(HttpStatus.BAD_REQUEST,"Unsupported document type");
        if (file.isEmpty() || file.getSize()>MAX_BYTES || !MIMES.contains(mime))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Upload a PDF, JPEG or PNG file up to 5 MB");
        byte[] bytes=file.getBytes();
        if (!signature(mime,bytes)) throw new ApiException(HttpStatus.BAD_REQUEST,"File signature does not match content type");
        String docId="sappdoc-"+UUID.randomUUID();
        String name=Optional.ofNullable(file.getOriginalFilename()).orElse("document").replaceAll("[^A-Za-z0-9._-]","_");
        jdbc.update("INSERT INTO SELLER_APPLICATION_DOCUMENTS (DOCUMENT_ID,APPLICATION_ID,DOCUMENT_TYPE,FILE_NAME,CONTENT_TYPE,FILE_SIZE,DOCUMENT_DATA,SCAN_STATUS,VERIFICATION_STATUS,UPLOADED_BY,UPLOADED_AT) VALUES (?,?,?,?,?,?,?,'QUARANTINED','PENDING',?,?)",
                docId,id,normalized,name,mime,(long)bytes.length,bytes,actor,LocalDateTime.now());
        String scan="SCAN_FAILED";
        try { scan=scanner.scan(bytes)==MalwareScanner.ScanResult.CLEAN?"CLEAN":"INFECTED"; }
        catch(RuntimeException ignored) { /* fail closed: document remains unavailable */ }
        jdbc.update("UPDATE SELLER_APPLICATION_DOCUMENTS SET SCAN_STATUS=?,SCANNED_AT=? WHERE DOCUMENT_ID=?",
                scan,"SCAN_FAILED".equals(scan)?null:LocalDateTime.now(),docId);
        audit(id,actor,"DOCUMENT_UPLOADED",normalized+":"+scan);
        return Map.of("documentId",docId,"documentType",normalized,"scanStatus",scan,
                "verificationStatus","PENDING","message","Documents are quarantined unless the malware scan succeeds");
    }

    private List<Map<String,Object>> documentMetadata(String id) {
        return jdbc.query("SELECT DOCUMENT_ID,DOCUMENT_TYPE,FILE_NAME,FILE_SIZE,SCAN_STATUS,VERIFICATION_STATUS,REJECTION_REASON,UPLOADED_AT FROM SELLER_APPLICATION_DOCUMENTS WHERE APPLICATION_ID=? ORDER BY UPLOADED_AT DESC",
                (rs,n)->Map.of("documentId",rs.getString(1),"documentType",rs.getString(2),"fileName",rs.getString(3),
                        "fileSize",rs.getLong(4),"scanStatus",rs.getString(5),"verificationStatus",rs.getString(6),
                        "rejectionReason",Objects.toString(rs.getString(7),""),"uploadedAt",rs.getTimestamp(8)),id);
    }

    private Map<String,Object> read(String id,boolean tokenRequired) { return read(id,tokenRequired,null); }
    private Map<String,Object> read(String id,boolean tokenRequired,String token) {
        List<Map<String,Object>> rows=jdbc.query("SELECT APPLICATION_JSON,STATUS,STATUS_REASON,ASSIGNED_TO,UPDATED_AT,ACCESS_TOKEN_HASH,ACCESS_TOKEN_EXPIRES_AT FROM SELLER_APPLICATIONS WHERE APPLICATION_ID=?",
                (rs,n)->{
                    Map<String,Object> m=new LinkedHashMap<>();
                    try { m.put("details",mapper.readValue(rs.getString(1),new TypeReference<Map<String,Object>>(){})); }
                    catch(Exception e) { throw new IllegalStateException("Invalid stored application",e); }
                    m.put("status",rs.getString(2));m.put("statusReason",rs.getString(3));
                    m.put("assignedTo",rs.getString(4));m.put("updatedAt",rs.getTimestamp(5));m.put("tokenHash",rs.getString(6));m.put("tokenExpiresAt",rs.getTimestamp(7));return m;
                },id);
        if(rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"Seller application not found");
        Map<String,Object> result=rows.get(0);
        if(tokenRequired && (token==null || !constantEquals(String.valueOf(result.get("tokenHash")),hash(token)) || result.get("tokenExpiresAt")==null || ((java.sql.Timestamp)result.get("tokenExpiresAt")).toLocalDateTime().isBefore(LocalDateTime.now())))
            throw new ApiException(HttpStatus.FORBIDDEN,"Invalid seller application access token");
        result.remove("tokenHash"); result.remove("tokenExpiresAt");
        result.put("applicationId",id);
        return result;
    }

    private void ensureVerifiedContactsUnchanged(Map<String,Object> original,Map<String,Object> updated) {
        if (original == null || text(original,"leadId").isBlank()) return;
        if (!text(original,"email").equalsIgnoreCase(text(updated,"email"))
                || !text(original,"phone").replaceAll("\\D","").equals(text(updated,"phone").replaceAll("\\D",""))) {
            throw new ApiException(HttpStatus.CONFLICT,"Verified email and mobile cannot be changed on a linked application. Restart contact verification for updated details.");
        }
    }

    private void requireCleanDocument(List<Map<String,Object>> docs,String type) {
        Map<String,Object> latest = docs.stream().filter(d -> type.equals(d.get("documentType"))).findFirst().orElse(null);
        if (latest == null || !"CLEAN".equals(latest.get("scanStatus")))
            throw new ApiException(HttpStatus.BAD_REQUEST,"A clean " + type + " document is required before submission");
    }

    private void requireVerifiedDocument(List<Map<String,Object>> docs,String type) {
        Map<String,Object> latest = docs.stream().filter(d -> type.equals(d.get("documentType"))).findFirst().orElse(null);
        if (latest == null || !"CLEAN".equals(latest.get("scanStatus")) || !"VERIFIED".equals(latest.get("verificationStatus")))
            throw new ApiException(HttpStatus.CONFLICT,"The latest " + type + " document must be clean and admin-verified before approval");
    }

    private void validate(Map<String,Object> body) {
        for(String key:List.of("ownerName","email","phone","shopName"))
            if(text(body,key).isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST,key+" is required");
        if(text(body,"ownerName").length()>150 || text(body,"shopName").length()>150 ||
                text(body,"email").length()>254 || text(body,"phone").replaceAll("\\D","").length()!=10)
            throw new ApiException(HttpStatus.BAD_REQUEST,"Check owner, shop, email and 10-digit mobile details");
        if(!text(body,"email").matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Enter a valid email address");
    }
    private String text(Map<String,Object> map,String key) { return Objects.toString(map.get(key),"").trim(); }
    private String json(Map<String,Object> map) { try{return mapper.writeValueAsString(map);}catch(Exception e){throw new ApiException(HttpStatus.BAD_REQUEST,"Invalid application details");} }
    private String like(String term) { return term.isBlank()?"%":"%"+term.replace("%","\\%").replace("_","\\_")+"%"; }
    private String hash(String value) { try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);} }
    private boolean constantEquals(String a,String b) { return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8),b.getBytes(StandardCharsets.UTF_8)); }
    private void audit(String id,String actor,String action,String details) { jdbc.update("INSERT INTO SELLER_APPLICATION_AUDIT (AUDIT_ID,APPLICATION_ID,ACTOR,ACTION,DETAILS,CREATED_AT) VALUES (?,?,?,?,?,?)","saud-"+UUID.randomUUID(),id,actor,action,details,LocalDateTime.now()); }
    private void requireAdmin(Authentication auth) { if(auth==null||auth.getAuthorities().stream().noneMatch(a->"ROLE_ADMIN".equals(a.getAuthority()))) throw new ApiException(HttpStatus.FORBIDDEN,"Administrator access required"); }
    private boolean signature(String mime,byte[] b) {
        if("application/pdf".equals(mime)) return b.length>=4&&b[0]=='%'&&b[1]=='P'&&b[2]=='D'&&b[3]=='F';
        if("image/png".equals(mime)) return b.length>=8&&(b[0]&255)==137&&b[1]==80&&b[2]==78&&b[3]==71;
        return b.length>=3&&(b[0]&255)==255&&(b[1]&255)==216&&(b[2]&255)==255;
    }
}
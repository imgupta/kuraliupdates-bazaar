package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class PrivacyComplianceController {
    private static final Set<String> REQUEST_TYPES = Set.of("ACCESS","CORRECTION","ERASURE","WITHDRAW_CONSENT","GRIEVANCE");
    private static final Set<String> REQUEST_STATUSES = Set.of("OPEN","IN_REVIEW","COMPLETED","REJECTED");
    private final JdbcTemplate jdbc;

    @GetMapping("/privacy/notice-metadata")
    public Map<String,Object> noticeMetadata() {
        Map<String,String> c=readConfig();
        return Map.of("version",c.getOrDefault("PRIVACY_NOTICE_VERSION","2026-11-16-v1"),
            "privacyContact",c.getOrDefault("PRIVACY_CONTACT_EMAIL","privacy@kuraliupdates.com"),
            "grievanceContact",c.getOrDefault("GRIEVANCE_CONTACT_EMAIL","support@kuraliupdates.com"),
            "noticeUrl","https://kuraliupdates.com/privacy");
    }

    @PostMapping("/me/privacy/notice-acknowledgement")
    public Map<String,Object> acknowledge(@RequestBody Map<String,String> body, Authentication auth) {
        UserEntity u=currentUser(auth);
        String version=required(body.get("version"),"Privacy notice version is required");
        String language=Optional.ofNullable(body.get("language")).orElse("en").trim().toLowerCase(Locale.ROOT);
        if(!Set.of("en","hi","pa").contains(language)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unsupported notice language");
        jdbc.update("MERGE INTO KU_PRIVACY_NOTICE_ACKS t USING (SELECT ? USER_ID, ? NOTICE_VERSION, ? LANGUAGE_CODE FROM dual) s ON (t.USER_ID=s.USER_ID AND t.NOTICE_VERSION=s.NOTICE_VERSION AND t.LANGUAGE_CODE=s.LANGUAGE_CODE) WHEN NOT MATCHED THEN INSERT (ACK_ID,USER_ID,NOTICE_VERSION,LANGUAGE_CODE,ACKNOWLEDGED_AT) VALUES (?,s.USER_ID,s.NOTICE_VERSION,s.LANGUAGE_CODE,?)",
            u.getUserId(),version,language,UUID.randomUUID().toString(),Timestamp.valueOf(LocalDateTime.now()));
        audit(u.getUserId(),"PRIVACY_NOTICE_ACKNOWLEDGED","USER",u.getUserId(),"version="+version+";language="+language);
        return Map.of("success",true,"version",version,"acknowledged",true);
    }

    @PostMapping("/me/privacy/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String,Object> createRequest(@RequestBody Map<String,String> body, Authentication auth) {
        UserEntity u=currentUser(auth);
        String type=required(body.get("type"),"Request type is required").toUpperCase(Locale.ROOT);
        if(!REQUEST_TYPES.contains(type)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unsupported privacy request type");
        String details=Optional.ofNullable(body.get("details")).orElse("").trim();
        if(details.length()>2000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Details must be 2000 characters or fewer");
        String id=UUID.randomUUID().toString(); LocalDateTime now=LocalDateTime.now();
        jdbc.update("INSERT INTO KU_PRIVACY_REQUESTS (REQUEST_ID,USER_ID,REQUEST_TYPE,DETAILS,STATUS,REQUESTED_AT,DUE_AT) VALUES (?,?,?,?,?,?,?)",
            id,u.getUserId(),type,details,"OPEN",Timestamp.valueOf(now),Timestamp.valueOf(now.plusDays(30)));
        audit(u.getUserId(),"PRIVACY_REQUEST_CREATED","PRIVACY_REQUEST",id,"type="+type);
        return Map.of("success",true,"requestId",id,"status","OPEN","requestedAt",now.toString());
    }

    @GetMapping("/me/privacy/requests")
    public List<Map<String,Object>> mine(Authentication auth) {
        UserEntity u=currentUser(auth);
        return jdbc.query("SELECT REQUEST_ID,REQUEST_TYPE,STATUS,REQUESTED_AT,DUE_AT,RESOLVED_AT,RESOLUTION_NOTE FROM KU_PRIVACY_REQUESTS WHERE USER_ID=? ORDER BY REQUESTED_AT DESC",(rs,n)->{
            Map<String,Object> m=new LinkedHashMap<>(); m.put("requestId",rs.getString("REQUEST_ID")); m.put("type",rs.getString("REQUEST_TYPE"));
            m.put("status",rs.getString("STATUS")); m.put("requestedAt",rs.getTimestamp("REQUESTED_AT")); m.put("dueAt",rs.getTimestamp("DUE_AT"));
            m.put("resolvedAt",rs.getTimestamp("RESOLVED_AT")); m.put("resolutionNote",rs.getString("RESOLUTION_NOTE")); return m;
        },u.getUserId());
    }

    @GetMapping("/admin/privacy/requests")
    public List<Map<String,Object>> queue(@RequestParam(defaultValue="OPEN") String status,Authentication auth) {
        requireAdmin(auth); String s=status.toUpperCase(Locale.ROOT);
        if(!REQUEST_STATUSES.contains(s)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unsupported status");
        return jdbc.query("SELECT REQUEST_ID,USER_ID,REQUEST_TYPE,DETAILS,STATUS,REQUESTED_AT,DUE_AT FROM KU_PRIVACY_REQUESTS WHERE STATUS=? ORDER BY REQUESTED_AT",(rs,n)->{
            Map<String,Object> m=new LinkedHashMap<>(); m.put("requestId",rs.getString("REQUEST_ID")); m.put("userId",rs.getString("USER_ID"));
            m.put("type",rs.getString("REQUEST_TYPE")); m.put("details",rs.getString("DETAILS")); m.put("status",rs.getString("STATUS"));
            m.put("requestedAt",rs.getTimestamp("REQUESTED_AT")); m.put("dueAt",rs.getTimestamp("DUE_AT")); return m;
        },s);
    }

    @PutMapping("/admin/privacy/requests/{id}")
    public Map<String,Object> update(@PathVariable String id,@RequestBody Map<String,String> body,Authentication auth) {
        UserEntity admin=requireAdmin(auth); String s=required(body.get("status"),"Status is required").toUpperCase(Locale.ROOT);
        if(!REQUEST_STATUSES.contains(s)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unsupported status");
        String note=Optional.ofNullable(body.get("resolutionNote")).orElse("").trim();
        if(note.length()>2000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Resolution note too long");
        int n=jdbc.update("UPDATE KU_PRIVACY_REQUESTS SET STATUS=?,RESOLUTION_NOTE=?,RESOLVED_AT=? WHERE REQUEST_ID=?",s,note,
            ("COMPLETED".equals(s)||"REJECTED".equals(s))?Timestamp.valueOf(LocalDateTime.now()):null,id);
        if(n==0) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Privacy request not found");
        audit(admin.getUserId(),"PRIVACY_REQUEST_UPDATED","PRIVACY_REQUEST",id,"status="+s);
        return Map.of("success",true,"requestId",id,"status",s);
    }

    @GetMapping("/admin/compliance/requirements")
    public Map<String,String> config(Authentication auth) { requireAdmin(auth); return readConfig(); }

    @PutMapping("/admin/compliance/requirements")
    public Map<String,Object> configure(@RequestBody Map<String,String> values,Authentication auth) {
        UserEntity admin=requireAdmin(auth);
        Set<String> allowed=Set.of("SELLER_GST_REQUIRED","SELLER_FSSAI_REQUIRED_CATEGORIES","SELLER_GST_REQUIRED_CATEGORIES",
            "MINIMUM_REGISTRATION_AGE","ALLOW_MINOR_REGISTRATION","PRIVACY_NOTICE_VERSION","PRIVACY_CONTACT_EMAIL","GRIEVANCE_CONTACT_EMAIL");
        for(var e:values.entrySet()) {
            if(!allowed.contains(e.getKey())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unsupported compliance setting: "+e.getKey());
            String v=required(e.getValue(),"Configuration values cannot be blank");
            if(v.length()>2000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Configuration value too long");
            if(Set.of("SELLER_GST_REQUIRED","ALLOW_MINOR_REGISTRATION").contains(e.getKey())&&!Set.of("true","false").contains(v.toLowerCase(Locale.ROOT)))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,e.getKey()+" must be true or false");
            if("MINIMUM_REGISTRATION_AGE".equals(e.getKey())) try {int a=Integer.parseInt(v);if(a<18||a>100)throw new NumberFormatException();}
                catch(NumberFormatException ex){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Minimum age must be between 18 and 100");}
            jdbc.update("UPDATE KU_COMPLIANCE_CONFIG SET CONFIG_VALUE=?,UPDATED_BY=?,UPDATED_AT=? WHERE CONFIG_KEY=?",v,admin.getUserId(),Timestamp.valueOf(LocalDateTime.now()),e.getKey());
        }
        audit(admin.getUserId(),"COMPLIANCE_CONFIG_UPDATED","PLATFORM","GLOBAL","keys="+String.join(",",values.keySet()));
        return Map.of("success",true,"settings",readConfig());
    }

    private Map<String,String> readConfig(){Map<String,String> m=new LinkedHashMap<>();jdbc.query("SELECT CONFIG_KEY,CONFIG_VALUE FROM KU_COMPLIANCE_CONFIG",(org.springframework.jdbc.core.RowCallbackHandler) rs->m.put(rs.getString(1),rs.getString(2)));return m;}
    private void audit(String actor,String type,String subjectType,String subjectId,String metadata){
        jdbc.update("INSERT INTO KU_SECURITY_AUDIT_EVENTS (EVENT_ID,ACTOR_USER_ID,EVENT_TYPE,SUBJECT_TYPE,SUBJECT_ID,CREATED_AT,METADATA) VALUES (?,?,?,?,?,?,?)",
            UUID.randomUUID().toString(),actor,type,subjectType,subjectId,Timestamp.valueOf(LocalDateTime.now()),metadata);
    }
    private UserEntity currentUser(Authentication a){if(a==null||!(a.getPrincipal() instanceof UserEntity u))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Authenticated account required");return u;}
    private UserEntity requireAdmin(Authentication a){UserEntity u=currentUser(a);if(!"ADMIN".equalsIgnoreCase(u.getRole())&&!Integer.valueOf(1).equals(u.getIsAdmin()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Administrator access required");return u;}
    private String required(String v,String m){if(v==null||v.isBlank())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,m);return v.trim();}
}

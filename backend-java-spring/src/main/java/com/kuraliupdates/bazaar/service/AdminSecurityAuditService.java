package com.kuraliupdates.bazaar.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/** Writes redacted, append-only audit events independently of business transactions. */
@Service
@RequiredArgsConstructor
public class AdminSecurityAuditService {
    private final JdbcTemplate jdbcTemplate;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String actorUserId, String actorEmail, String action, String targetType,
                       String targetId, String method, String path, String outcome,
                       int httpStatus, String details) {
        jdbcTemplate.update("""
                INSERT INTO SECURITY_AUDIT_EVENTS
                  (EVENT_ID, ACTOR_USER_ID, ACTOR_EMAIL, EVENT_CATEGORY, ACTION,
                   TARGET_TYPE, TARGET_ID, REQUEST_METHOD, REQUEST_PATH, OUTCOME,
                   HTTP_STATUS, DETAILS, OCCURRED_AT)
                VALUES (?, ?, ?, 'ADMIN_MUTATION', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID().toString(), actorUserId, actorEmail, action,
                targetType, targetId, method, path, outcome, httpStatus,
                details, LocalDateTime.now());
    }
}

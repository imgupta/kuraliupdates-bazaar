-- Replace all legacy raw session tokens with SHA-256 digests before the
-- application switches every lookup and handoff reference to digest form.
-- STANDARD_HASH returns RAW; RAWTOHEX + LOWER matches AuthService.hashSessionToken.
UPDATE USER_SESSIONS
   SET SESSION_TOKEN = LOWER(RAWTOHEX(STANDARD_HASH(SESSION_TOKEN, 'SHA256')))
 WHERE LENGTH(SESSION_TOKEN) <> 64
    OR SESSION_TOKEN <> LOWER(SESSION_TOKEN);

UPDATE AUTH_PORTAL_HANDOFFS
   SET SESSION_TOKEN = LOWER(RAWTOHEX(STANDARD_HASH(SESSION_TOKEN, 'SHA256')))
 WHERE LENGTH(SESSION_TOKEN) <> 64
    OR SESSION_TOKEN <> LOWER(SESSION_TOKEN);

-- Cap previously issued long-lived sessions at twelve hours from creation.
-- Existing E2E sessions already have shorter expiries and remain unchanged.
UPDATE USER_SESSIONS
   SET EXPIRES_AT = NVL(CREATED_AT, CURRENT_TIMESTAMP) + INTERVAL '12' HOUR
 WHERE EXPIRES_AT > NVL(CREATED_AT, CURRENT_TIMESTAMP) + INTERVAL '12' HOUR;

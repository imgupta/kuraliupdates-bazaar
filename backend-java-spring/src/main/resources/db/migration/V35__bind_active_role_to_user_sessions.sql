-- Bind a role to each session so a multi-role E2E identity cannot elevate
-- previously issued buyer/seller sessions when an ADMIN token is issued.
ALTER TABLE USER_SESSIONS ADD ACTIVE_ROLE VARCHAR2(20);

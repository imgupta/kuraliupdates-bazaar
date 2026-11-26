-- Make returns opt-in: unknown categories and products must not be returnable by default.
-- Preserve explicit category rules; only the global fallback is changed.
UPDATE KU_RETURN_POLICIES SET IS_RETURNABLE=0, RETURN_WINDOW_DAYS=0, UPDATED_AT=CURRENT_TIMESTAMP WHERE CATEGORY='*';

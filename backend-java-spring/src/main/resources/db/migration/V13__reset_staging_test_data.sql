-- One-time cleanup for the staging/test environment.
-- Clears user-generated business and test data while retaining admin login accounts.
-- Re-seeds the standard Daily Help catalogue so new end-to-end tests can run.
-- This migration is intentionally destructive and must only be deployed to the
-- environment the owner designated as staging.
-- Oracle Autonomous Database can enable parallel DML for these tables; disable it
-- for this multi-table cleanup so repeated DML in one migration is legal.
ALTER SESSION DISABLE PARALLEL DML;

DELETE FROM CHAT_MESSAGES;
DELETE FROM NEGOTIATION_CHATS;
DELETE FROM ORDER_ITEMS;
DELETE FROM ORDERS;
DELETE FROM USER_SESSIONS;
DELETE FROM USER_ADDRESSES;
DELETE FROM AUTH_OTPS;

DELETE FROM DAILY_HELP_PROFESSIONAL_SLOTS;
DELETE FROM DAILY_HELP_BOOKINGS;
DELETE FROM DAILY_HELP_PROFESSIONALS;
DELETE FROM SEARCH_TRENDS;

DELETE FROM BILL_DISCOUNTS;
DELETE FROM COUPONS;
DELETE FROM PRODUCTS;
DELETE FROM DELIVERY_AGENTS;
DELETE FROM SELLERS;

-- Keep admin accounts to avoid locking out the operator after the reset.
DELETE FROM USERS
 WHERE NVL(IS_ADMIN, 0) <> 1
   AND NVL(ROLE, 'BUYER') <> 'ADMIN'
   AND (EMAIL IS NULL OR LOWER(EMAIL) NOT IN (
       'shubham.gupta180296@gmail.com',
       'sg7508359237@gmail.com',
       'admin@kuraliupdates.com'
   ));

-- Daily Help service definitions are reference/catalog data. Rebuild a known,
-- deterministic catalogue after removing any edited/test rows.
DELETE FROM DAILY_HELP_SERVICES;

INSERT INTO DAILY_HELP_SERVICES
  (SERVICE_ID, CATEGORY, NAME, DESCRIPTION, PRICING_UNIT, PRICE_PER_HOUR, MIN_HOURS, ACTIVE)
VALUES
  ('DH-MAID', 'Everyday Help', 'Maid / Home Helper',
   'Sweeping, mopping, dusting, dishes and everyday household help.', 'HOUR', 199, 2, 1);

INSERT INTO DAILY_HELP_SERVICES
  (SERVICE_ID, CATEGORY, NAME, DESCRIPTION, PRICING_UNIT, PRICE_PER_HOUR, MIN_HOURS, ACTIVE)
VALUES
  ('DH-COOK', 'Everyday Help', 'Cooking Help',
   'Everyday meal preparation and kitchen assistance at home.', 'HOUR', 249, 2, 1);

INSERT INTO DAILY_HELP_SERVICES
  (SERVICE_ID, CATEGORY, NAME, DESCRIPTION, PRICING_UNIT, PRICE_PER_HOUR, MIN_HOURS, ACTIVE)
VALUES
  ('DH-LAUNDRY', 'Everyday Help', 'Laundry & Folding',
   'Washing, drying, folding and basic laundry assistance.', 'HOUR', 199, 2, 1);

INSERT INTO DAILY_HELP_SERVICES
  (SERVICE_ID, CATEGORY, NAME, DESCRIPTION, PRICING_UNIT, PRICE_PER_HOUR, MIN_HOURS, ACTIVE)
VALUES
  ('DH-KITCHEN', 'Cleaning', 'Kitchen & Utensils',
   'Kitchen cleaning, dishes, counters and routine utensil washing.', 'HOUR', 199, 1, 1);

INSERT INTO DAILY_HELP_SERVICES
  (SERVICE_ID, CATEGORY, NAME, DESCRIPTION, PRICING_UNIT, PRICE_PER_HOUR, MIN_HOURS, ACTIVE)
VALUES
  ('DH-BATHROOM', 'Cleaning', 'Bathroom Cleaning',
   'Routine bathroom cleaning and sanitisation assistance.', 'HOUR', 249, 1, 1);


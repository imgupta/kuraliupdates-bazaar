package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class E2eRunCleanupService {
    private final JdbcTemplate jdbc;

    /**
     * Deletes only rows explicitly tagged to this run. It first validates every
     * tagged order, booking and chat; any non-synthetic relationship aborts before
     * the first write. Order stock is restored exactly once before deleting items.
     */
    @Transactional
    public CleanupResult cleanup(String runId) {
        // Serialize cleanup transactions across run IDs. Oracle can otherwise
        // deadlock concurrent deletes that modify adjacent index leaf blocks
        // even though each request is restricted to a different E2E_RUN_ID.
        // V36 seeds this singleton row; the lock is held until this transaction commits.
        jdbc.queryForObject(
                "SELECT LOCK_NAME FROM E2E_CLEANUP_MUTEX WHERE LOCK_NAME = 'GLOBAL' FOR UPDATE",
                String.class);
        long unsafeOrders = count("""
                SELECT COUNT(*) FROM ORDERS o
                WHERE o.E2E_RUN_ID = ?
                  AND ((UPPER(NVL(o.STATUS, 'UNKNOWN')) LIKE '%REFUND%'
                           OR UPPER(NVL(o.STATUS, 'UNKNOWN')) LIKE '%RETURN%'
                           OR (UPPER(NVL(o.STATUS, 'UNKNOWN')) LIKE '%CANCEL%'
                               AND (UPPER(NVL(o.PAYMENT_STATUS, 'UNKNOWN')) <> 'PENDING_COD'
                                    OR UPPER(NVL(o.FULFILMENT_STATUS, 'UNKNOWN')) <> 'CANCELLED')))
                       OR EXISTS (SELECT 1 FROM ORDER_ITEMS oi
                                  WHERE oi.ORDER_ID = o.ORDER_ID
                                    AND (oi.PRODUCT_ID NOT LIKE 'E2E-%' OR oi.QUANTITY <= 0
                                         OR NOT EXISTS (SELECT 1 FROM PRODUCTS p
                                                        WHERE p.PRODUCT_ID = oi.PRODUCT_ID
                                                          AND p.E2E_RUN_ID = o.E2E_RUN_ID
                                                          AND p.SELLER_ID = o.SELLER_ID))))
                """, runId);
        long unsafeBookings = count("""
                SELECT COUNT(*) FROM DAILY_HELP_BOOKINGS b
                WHERE b.E2E_RUN_ID = ?
                  AND (b.SERVICE_ID NOT LIKE 'E2E-%'
                       OR b.PROFESSIONAL_ID IS NULL
                       OR NOT EXISTS (SELECT 1 FROM DAILY_HELP_SERVICES ds
                                      WHERE ds.SERVICE_ID = b.SERVICE_ID
                                        AND ds.E2E_RUN_ID = b.E2E_RUN_ID)
                       OR NOT EXISTS (SELECT 1 FROM DAILY_HELP_PROFESSIONAL_SLOTS s
                                      WHERE s.E2E_RUN_ID = b.E2E_RUN_ID
                                        AND s.SLOT_ID LIKE 'E2E-%'
                                        AND s.PROFESSIONAL_ID = b.PROFESSIONAL_ID
                                        AND s.BOOKING_ID = b.BOOKING_ID))
                """, runId);
        long unsafeChats = count("""
                SELECT COUNT(*) FROM NEGOTIATION_CHATS c
                WHERE c.E2E_RUN_ID = ?
                  AND (c.PRODUCT_ID NOT LIKE 'E2E-%'
                       OR NOT EXISTS (SELECT 1 FROM PRODUCTS p
                                      WHERE p.PRODUCT_ID = c.PRODUCT_ID
                                        AND p.E2E_RUN_ID = c.E2E_RUN_ID
                                        AND p.SELLER_ID = c.SELLER_ID))
                """, runId);
        long unsafeProducts = count("""
                SELECT COUNT(*) FROM PRODUCTS p
                WHERE p.E2E_RUN_ID = ?
                  AND (p.PRODUCT_ID NOT LIKE 'E2E-%'
                       OR EXISTS (SELECT 1 FROM ORDER_ITEMS oi JOIN ORDERS o ON o.ORDER_ID = oi.ORDER_ID
                                  WHERE oi.PRODUCT_ID = p.PRODUCT_ID AND NVL(o.E2E_RUN_ID, '-') <> ?)
                       OR EXISTS (SELECT 1 FROM NEGOTIATION_CHATS nc
                                  WHERE nc.PRODUCT_ID = p.PRODUCT_ID AND NVL(nc.E2E_RUN_ID, '-') <> ?)
                       OR NOT EXISTS (SELECT 1 FROM SELLERS s
                                      WHERE s.SELLER_ID = p.SELLER_ID
                                        AND (s.E2E_RUN_ID IS NULL OR s.E2E_RUN_ID = p.E2E_RUN_ID)))
                """, runId, runId, runId);
        long unsafeServices = count("""
                SELECT COUNT(*) FROM DAILY_HELP_SERVICES s
                WHERE s.E2E_RUN_ID = ?
                  AND (s.SERVICE_ID NOT LIKE 'E2E-%'
                       OR EXISTS (SELECT 1 FROM DAILY_HELP_BOOKINGS b
                                  WHERE b.SERVICE_ID = s.SERVICE_ID AND NVL(b.E2E_RUN_ID, '-') <> ?))
                """, runId, runId);
        long unsafeSlots = count("""
                SELECT COUNT(*) FROM DAILY_HELP_PROFESSIONAL_SLOTS s
                WHERE s.E2E_RUN_ID = ?
                  AND (s.SLOT_ID NOT LIKE 'E2E-%'
                       OR EXISTS (SELECT 1 FROM DAILY_HELP_BOOKINGS b
                                  WHERE b.BOOKING_ID = s.BOOKING_ID
                                    AND NVL(b.E2E_RUN_ID, '-') <> ?))
                """, runId, runId);
        long unsafeSellers = count("""
                SELECT COUNT(*) FROM SELLERS s
                WHERE s.E2E_RUN_ID = ?
                  AND (s.SELLER_ID NOT LIKE 'E2E-%'
                       OR EXISTS (SELECT 1 FROM PRODUCTS p
                                  WHERE p.SELLER_ID = s.SELLER_ID AND NVL(p.E2E_RUN_ID, '-') <> ?)
                       OR EXISTS (SELECT 1 FROM ORDERS o
                                  WHERE o.SELLER_ID = s.SELLER_ID AND NVL(o.E2E_RUN_ID, '-') <> ?))
                """, runId, runId, runId);
        if (unsafeOrders != 0 || unsafeBookings != 0 || unsafeChats != 0
                || unsafeProducts != 0 || unsafeServices != 0 || unsafeSlots != 0 || unsafeSellers != 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Run cleanup refused before any writes; unsafe tagged-row counts: orders=" + unsafeOrders
                            + ", bookings=" + unsafeBookings + ", chats=" + unsafeChats
                            + ", products=" + unsafeProducts + ", services=" + unsafeServices
                            + ", slots=" + unsafeSlots + ", sellers=" + unsafeSellers
                            + ". No records were changed.");
        }

        // Oracle may choose parallel DML even when cleanup requests are serialized.
        // Keep every run-scoped delete serial to avoid ORA-12860 sibling-row locks.
        int chats = jdbc.update("""
                DELETE /*+ NO_PARALLEL */ FROM CHAT_MESSAGES
                WHERE CHAT_ID IN (SELECT CHAT_ID FROM NEGOTIATION_CHATS WHERE E2E_RUN_ID = ?)
                """, runId);
        int deletedChats = jdbc.update("DELETE /*+ NO_PARALLEL */ FROM NEGOTIATION_CHATS WHERE E2E_RUN_ID = ?", runId);

        jdbc.update("""
                UPDATE DAILY_HELP_PROFESSIONAL_SLOTS
                SET STATUS = 'AVAILABLE', BOOKING_ID = NULL, UPDATED_AT = CURRENT_TIMESTAMP
                WHERE SLOT_ID LIKE 'E2E-%' AND STATUS = 'BOOKED'
                  AND BOOKING_ID IN (SELECT BOOKING_ID FROM DAILY_HELP_BOOKINGS WHERE E2E_RUN_ID = ?)
                """, runId);
        int bookings = jdbc.update("DELETE /*+ NO_PARALLEL */ FROM DAILY_HELP_BOOKINGS WHERE E2E_RUN_ID = ?", runId);

        jdbc.update("""
                UPDATE PRODUCTS p
                SET STOCK = NVL(STOCK, 0) + (
                    SELECT SUM(oi.QUANTITY)
                    FROM ORDER_ITEMS oi JOIN ORDERS o ON o.ORDER_ID = oi.ORDER_ID
                    WHERE o.E2E_RUN_ID = ? AND oi.PRODUCT_ID = p.PRODUCT_ID
                      AND UPPER(NVL(o.STATUS, 'UNKNOWN')) NOT LIKE '%CANCEL%'
                )
                WHERE p.PRODUCT_ID LIKE 'E2E-%'
                  AND p.E2E_RUN_ID = ?
                  AND EXISTS (SELECT 1 FROM ORDER_ITEMS oi JOIN ORDERS o ON o.ORDER_ID = oi.ORDER_ID
                              WHERE o.E2E_RUN_ID = ? AND oi.PRODUCT_ID = p.PRODUCT_ID)
                """, runId, runId, runId);
        int orderItems = jdbc.update("""
                DELETE /*+ NO_PARALLEL */ FROM ORDER_ITEMS
                WHERE ORDER_ID IN (SELECT ORDER_ID FROM ORDERS WHERE E2E_RUN_ID = ?)
                """, runId);
        int orders = jdbc.update("DELETE /*+ NO_PARALLEL */ FROM ORDERS WHERE E2E_RUN_ID = ?", runId);
        int products = jdbc.update("DELETE /*+ NO_PARALLEL */ FROM PRODUCTS WHERE E2E_RUN_ID = ?", runId);
        int slots = jdbc.update("DELETE /*+ NO_PARALLEL */ FROM DAILY_HELP_PROFESSIONAL_SLOTS WHERE E2E_RUN_ID = ?", runId);
        int services = jdbc.update("DELETE /*+ NO_PARALLEL */ FROM DAILY_HELP_SERVICES WHERE E2E_RUN_ID = ?", runId);
        int sellers = jdbc.update("DELETE /*+ NO_PARALLEL */ FROM SELLERS WHERE E2E_RUN_ID = ?", runId);

        int sessions = jdbc.update("DELETE /*+ NO_PARALLEL */ FROM USER_SESSIONS WHERE E2E_RUN_ID = ?", runId);
        return new CleanupResult(runId, orders, orderItems, bookings, deletedChats, chats, sessions,
                products, services, slots, sellers);
    }

    private long count(String sql, String... params) {
        Long value = jdbc.queryForObject(sql, Long.class, (Object[]) params);
        return value == null ? 0 : value;
    }

    public record CleanupResult(String runId, int orders, int orderItems, int dailyHelpBookings,
                                int negotiationChats, int chatMessages, int sessions,
                                int products, int dailyHelpServices, int dailyHelpSlots, int sellers) {}
}

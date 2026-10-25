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
        long unsafeOrders = count("""
                SELECT COUNT(*) FROM ORDERS o
                WHERE o.E2E_RUN_ID = ?
                  AND (o.SELLER_ID NOT LIKE 'E2E-%'
                       OR (UPPER(NVL(o.STATUS, 'UNKNOWN')) LIKE '%CANCEL%' OR UPPER(NVL(o.STATUS, 'UNKNOWN')) LIKE '%REFUND%')
                       OR EXISTS (SELECT 1 FROM ORDER_ITEMS oi
                                  WHERE oi.ORDER_ID = o.ORDER_ID
                                    AND (oi.PRODUCT_ID NOT LIKE 'E2E-%' OR oi.QUANTITY <= 0)))
                """, runId);
        long unsafeBookings = count("""
                SELECT COUNT(*) FROM DAILY_HELP_BOOKINGS b
                WHERE b.E2E_RUN_ID = ?
                  AND (b.SERVICE_ID NOT LIKE 'E2E-%'
                       OR b.PROFESSIONAL_ID IS NULL
                       OR b.PROFESSIONAL_ID NOT LIKE 'E2E-%'
                       OR NOT EXISTS (SELECT 1 FROM DAILY_HELP_PROFESSIONAL_SLOTS s
                                      WHERE s.BOOKING_ID = b.BOOKING_ID
                                        AND s.SLOT_ID LIKE 'E2E-%'
                                        AND s.STATUS = 'BOOKED'
                                        AND s.PROFESSIONAL_ID = b.PROFESSIONAL_ID))
                """, runId);
        long unsafeChats = count("""
                SELECT COUNT(*) FROM NEGOTIATION_CHATS c
                WHERE c.E2E_RUN_ID = ?
                  AND (c.PRODUCT_ID NOT LIKE 'E2E-%' OR c.SELLER_ID NOT LIKE 'E2E-%')
                """, runId);
        if (unsafeOrders != 0 || unsafeBookings != 0 || unsafeChats != 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Run cleanup refused: one or more tagged records are not exclusively synthetic; no records were changed");
        }

        int chats = jdbc.update("""
                DELETE FROM CHAT_MESSAGES
                WHERE CHAT_ID IN (SELECT CHAT_ID FROM NEGOTIATION_CHATS WHERE E2E_RUN_ID = ?)
                """, runId);
        int deletedChats = jdbc.update("DELETE FROM NEGOTIATION_CHATS WHERE E2E_RUN_ID = ?", runId);

        jdbc.update("""
                UPDATE DAILY_HELP_PROFESSIONAL_SLOTS
                SET STATUS = 'AVAILABLE', BOOKING_ID = NULL, UPDATED_AT = CURRENT_TIMESTAMP
                WHERE SLOT_ID LIKE 'E2E-%' AND STATUS = 'BOOKED'
                  AND BOOKING_ID IN (SELECT BOOKING_ID FROM DAILY_HELP_BOOKINGS WHERE E2E_RUN_ID = ?)
                """, runId);
        int bookings = jdbc.update("DELETE FROM DAILY_HELP_BOOKINGS WHERE E2E_RUN_ID = ?", runId);

        jdbc.update("""
                UPDATE PRODUCTS p
                SET STOCK = NVL(STOCK, 0) + (
                    SELECT SUM(oi.QUANTITY)
                    FROM ORDER_ITEMS oi JOIN ORDERS o ON o.ORDER_ID = oi.ORDER_ID
                    WHERE o.E2E_RUN_ID = ? AND oi.PRODUCT_ID = p.PRODUCT_ID
                )
                WHERE p.PRODUCT_ID LIKE 'E2E-%'
                  AND EXISTS (SELECT 1 FROM ORDER_ITEMS oi JOIN ORDERS o ON o.ORDER_ID = oi.ORDER_ID
                              WHERE o.E2E_RUN_ID = ? AND oi.PRODUCT_ID = p.PRODUCT_ID)
                """, runId, runId);
        int orderItems = jdbc.update("""
                DELETE FROM ORDER_ITEMS
                WHERE ORDER_ID IN (SELECT ORDER_ID FROM ORDERS WHERE E2E_RUN_ID = ?)
                """, runId);
        int orders = jdbc.update("DELETE FROM ORDERS WHERE E2E_RUN_ID = ?", runId);

        return new CleanupResult(runId, orders, orderItems, bookings, deletedChats, chats);
    }

    private long count(String sql, String runId) {
        Long value = jdbc.queryForObject(sql, Long.class, runId);
        return value == null ? 0 : value;
    }

    public record CleanupResult(String runId, int orders, int orderItems, int dailyHelpBookings,
                                int negotiationChats, int chatMessages) {}
}

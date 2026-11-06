package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.controller.NegotiationChatController.RespondOfferRequest;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.BargainExpiredException;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@JdbcTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:negotiation_expiry;MODE=Oracle;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.enabled=false"
})
@Import({NegotiationChatService.class, NegotiationChatServiceExpirationJdbcTest.JdbcConfig.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class NegotiationChatServiceExpirationJdbcTest {
    @Autowired private JdbcTemplate jdbc;
    @Autowired private NegotiationChatService service;
    @MockBean private SellerRepository sellerRepository;

    @BeforeEach
    void createIsolatedBargainTables() {
        jdbc.execute("DROP TABLE IF EXISTS CHAT_MESSAGES");
        jdbc.execute("DROP TABLE IF EXISTS NEGOTIATION_CHATS");
        jdbc.execute("""
                CREATE TABLE NEGOTIATION_CHATS (
                    CHAT_ID VARCHAR(64) PRIMARY KEY,
                    BARGAIN_STATUS VARCHAR(32) NOT NULL,
                    EXPIRES_AT TIMESTAMP,
                    CLOSED_AT TIMESTAMP,
                    CURRENT_AGREED_PRICE DECIMAL(12,2),
                    LAST_UPDATED TIMESTAMP
                )
                """);
        jdbc.execute("""
                CREATE TABLE CHAT_MESSAGES (
                    MESSAGE_ID VARCHAR(64) PRIMARY KEY,
                    CHAT_ID VARCHAR(64) NOT NULL,
                    OFFER_STATUS VARCHAR(32)
                )
                """);
        Timestamp expiredAt = Timestamp.valueOf(LocalDateTime.now().minusMinutes(2));
        jdbc.update("""
                INSERT INTO NEGOTIATION_CHATS
                    (CHAT_ID, BARGAIN_STATUS, EXPIRES_AT, CURRENT_AGREED_PRICE, LAST_UPDATED)
                VALUES (?, 'PENDING_SELLER', ?, ?, ?)
                """, "chat-1", expiredAt, new BigDecimal("80.00"), expiredAt);
        jdbc.update("INSERT INTO CHAT_MESSAGES (MESSAGE_ID, CHAT_ID, OFFER_STATUS) VALUES (?, ?, 'PENDING')",
                "offer-1", "chat-1");
    }

    @Test
    void expiredResponseCommitsChatAndOfferExpiryBeforeReturningConflict() {
        UserEntity buyer = UserEntity.builder()
                .userId("buyer-1")
                .email("buyer@example.test")
                .name("Test Buyer")
                .role("BUYER")
                .build();

        BargainExpiredException error = assertThrows(BargainExpiredException.class,
                () -> service.respond(buyer, "BUYER", "chat-1", "offer-1",
                        new RespondOfferRequest("ACCEPT", null)));

        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.getStatus());
        assertEquals("EXPIRED", jdbc.queryForObject(
                "SELECT BARGAIN_STATUS FROM NEGOTIATION_CHATS WHERE CHAT_ID=?", String.class, "chat-1"));
        assertNotNull(jdbc.queryForObject(
                "SELECT CLOSED_AT FROM NEGOTIATION_CHATS WHERE CHAT_ID=?", Timestamp.class, "chat-1"));
        assertNull(jdbc.queryForObject(
                "SELECT CURRENT_AGREED_PRICE FROM NEGOTIATION_CHATS WHERE CHAT_ID=?", BigDecimal.class, "chat-1"));
        assertEquals("EXPIRED", jdbc.queryForObject(
                "SELECT OFFER_STATUS FROM CHAT_MESSAGES WHERE MESSAGE_ID=?", String.class, "offer-1"));
    }

    @TestConfiguration
    static class JdbcConfig {
        @Bean
        @Primary
        JdbcTemplate negotiationJdbcTemplate(DataSource dataSource) {
            return new JdbcTemplate(dataSource) {
                @Override
                @SuppressWarnings("unchecked")
                public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
                    if (sql.contains("FROM NEGOTIATION_CHATS c JOIN PRODUCTS p")) {
                        Map<String, Object> chat = new HashMap<>();
                        chat.put("id", "chat-1");
                        chat.put("buyerEmail", "buyer@example.test");
                        chat.put("sellerId", "seller-1");
                        chat.put("sellerStatus", "APPROVED");
                        chat.put("bargainStatus", "PENDING_SELLER");
                        chat.put("expiresAt", Timestamp.valueOf(LocalDateTime.now().minusMinutes(2)));
                        chat.put("originalPrice", new BigDecimal("100.00"));
                        return (List<T>) List.of(chat);
                    }
                    return super.query(sql, rowMapper, args);
                }
            };
        }
    }
}

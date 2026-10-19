package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Adds server-backed negotiation tables without dropping or rewriting existing data.
 * It also tolerates tables already created by the legacy runtime setup script.
 */
public class V14__NegotiationChatSchema extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        if (!tableExists(connection, "PRODUCTS") || !tableExists(connection, "SELLERS")) {
            throw new SQLException("Negotiation chat migration requires the existing PRODUCTS and SELLERS tables.");
        }

        if (!tableExists(connection, "NEGOTIATION_CHATS")) {
            execute(connection, """
                CREATE TABLE NEGOTIATION_CHATS (
                    CHAT_ID VARCHAR2(64) PRIMARY KEY,
                    PRODUCT_ID VARCHAR2(64) NOT NULL REFERENCES PRODUCTS(PRODUCT_ID),
                    SELLER_ID VARCHAR2(64) NOT NULL REFERENCES SELLERS(SELLER_ID),
                    BUYER_NAME VARCHAR2(150) NOT NULL,
                    BUYER_EMAIL VARCHAR2(255) NOT NULL,
                    CURRENT_AGREED_PRICE NUMBER(10,2),
                    LAST_UPDATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """);
        }

        if (!tableExists(connection, "CHAT_MESSAGES")) {
            if (!tableExists(connection, "NEGOTIATION_CHATS")) {
                throw new SQLException("NEGOTIATION_CHATS was not created; cannot create CHAT_MESSAGES.");
            }
            execute(connection, """
                CREATE TABLE CHAT_MESSAGES (
                    MESSAGE_ID VARCHAR2(64) PRIMARY KEY,
                    CHAT_ID VARCHAR2(64) NOT NULL REFERENCES NEGOTIATION_CHATS(CHAT_ID) ON DELETE CASCADE,
                    SENDER_ROLE VARCHAR2(20) NOT NULL CHECK (SENDER_ROLE IN ('BUYER', 'SELLER')),
                    SENDER_NAME VARCHAR2(150) NOT NULL,
                    MESSAGE_TEXT CLOB NOT NULL,
                    OFFER_PRICE NUMBER(10,2),
                    OFFER_STATUS VARCHAR2(20) CHECK (OFFER_STATUS IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED')),
                    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """);
        }

        ensureIndex(connection, "IDX_CHAT_SELLER", "CREATE INDEX IDX_CHAT_SELLER ON NEGOTIATION_CHATS(SELLER_ID)");
        ensureIndex(connection, "IDX_CHAT_PROD", "CREATE INDEX IDX_CHAT_PROD ON NEGOTIATION_CHATS(PRODUCT_ID)");
        ensureIndex(connection, "IDX_CHAT_BUYER", "CREATE INDEX IDX_CHAT_BUYER ON NEGOTIATION_CHATS(BUYER_EMAIL)");
        ensureIndex(connection, "IDX_MSG_CHAT", "CREATE INDEX IDX_MSG_CHAT ON CHAT_MESSAGES(CHAT_ID)");
        ensureIndex(connection, "IDX_CHAT_SELLER_UPDATED", "CREATE INDEX IDX_CHAT_SELLER_UPDATED ON NEGOTIATION_CHATS(SELLER_ID, LAST_UPDATED)");
        ensureIndex(connection, "IDX_CHAT_BUYER_UPDATED", "CREATE INDEX IDX_CHAT_BUYER_UPDATED ON NEGOTIATION_CHATS(BUYER_EMAIL, LAST_UPDATED)");
        ensureIndex(connection, "IDX_MSG_CHAT_CREATED", "CREATE INDEX IDX_MSG_CHAT_CREATED ON CHAT_MESSAGES(CHAT_ID, CREATED_AT)");
    }

    private boolean tableExists(Connection connection, String name) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = ?")) {
            statement.setString(1, name);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() && result.getInt(1) > 0;
            }
        }
    }

    private void ensureIndex(Connection connection, String name, String ddl) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM USER_INDEXES WHERE INDEX_NAME = ?")) {
            statement.setString(1, name);
            try (ResultSet result = statement.executeQuery()) {
                if (result.next() && result.getInt(1) > 0) return;
            }
        }
        execute(connection, ddl);
    }

    private void execute(Connection connection, String ddl) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute(ddl);
        }
    }
}

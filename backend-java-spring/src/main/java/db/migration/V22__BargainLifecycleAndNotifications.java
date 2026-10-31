package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/** Adds an explicit bargain lifecycle and durable in-app events. Existing chats remain valid. */
public class V22__BargainLifecycleAndNotifications extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection c = context.getConnection();
        addColumn(c, "NEGOTIATION_CHATS", "BARGAIN_STATUS", "VARCHAR2(24) DEFAULT 'PENDING_SELLER' NOT NULL");
        addColumn(c, "NEGOTIATION_CHATS", "EXPIRES_AT", "TIMESTAMP");
        addColumn(c, "NEGOTIATION_CHATS", "CLOSED_AT", "TIMESTAMP");
        execute(c, "UPDATE NEGOTIATION_CHATS SET BARGAIN_STATUS = CASE WHEN CURRENT_AGREED_PRICE IS NOT NULL THEN 'ACCEPTED' ELSE 'PENDING_SELLER' END, EXPIRES_AT = CASE WHEN CURRENT_AGREED_PRICE IS NULL THEN NVL(LAST_UPDATED, CURRENT_TIMESTAMP) + INTERVAL '1' DAY ELSE NULL END");
        ensureIndex(c, "IDX_CHAT_STATUS_EXPIRY", "CREATE INDEX IDX_CHAT_STATUS_EXPIRY ON NEGOTIATION_CHATS(BARGAIN_STATUS, EXPIRES_AT)");
        if (!tableExists(c, "BARGAIN_NOTIFICATIONS")) {
            execute(c, """
                CREATE TABLE BARGAIN_NOTIFICATIONS (
                    NOTIFICATION_ID VARCHAR2(64) PRIMARY KEY,
                    CHAT_ID VARCHAR2(64) NOT NULL REFERENCES NEGOTIATION_CHATS(CHAT_ID) ON DELETE CASCADE,
                    RECIPIENT_EMAIL VARCHAR2(255) NOT NULL,
                    RECIPIENT_ROLE VARCHAR2(20) NOT NULL CHECK (RECIPIENT_ROLE IN ('BUYER','SELLER')),
                    EVENT_TYPE VARCHAR2(32) NOT NULL,
                    MESSAGE_TEXT VARCHAR2(500) NOT NULL,
                    IS_READ NUMBER(1) DEFAULT 0 NOT NULL CHECK (IS_READ IN (0,1)),
                    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    READ_AT TIMESTAMP
                )
                """);
            ensureIndex(c, "IDX_BARGAIN_NOTIF_USER", "CREATE INDEX IDX_BARGAIN_NOTIF_USER ON BARGAIN_NOTIFICATIONS(RECIPIENT_EMAIL, IS_READ, CREATED_AT)");
        }
    }

    private boolean tableExists(Connection c, String name) throws Exception {
        try (PreparedStatement p = c.prepareStatement("SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME=?")) {
            p.setString(1, name);
            try (ResultSet r = p.executeQuery()) { return r.next() && r.getInt(1) > 0; }
        }
    }
    private boolean columnExists(Connection c, String table, String column) throws Exception {
        try (PreparedStatement p = c.prepareStatement("SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME=? AND COLUMN_NAME=?")) {
            p.setString(1, table); p.setString(2, column);
            try (ResultSet r = p.executeQuery()) { return r.next() && r.getInt(1) > 0; }
        }
    }
    private void addColumn(Connection c, String table, String column, String ddl) throws Exception {
        if (!columnExists(c, table, column)) execute(c, "ALTER TABLE " + table + " ADD " + column + " " + ddl);
    }
    private void ensureIndex(Connection c, String name, String ddl) throws Exception {
        try (PreparedStatement p = c.prepareStatement("SELECT COUNT(*) FROM USER_INDEXES WHERE INDEX_NAME=?")) {
            p.setString(1, name);
            try (ResultSet r = p.executeQuery()) { if (r.next() && r.getInt(1) > 0) return; }
        }
        execute(c, ddl);
    }
    private void execute(Connection c, String sql) throws Exception {
        try (Statement s = c.createStatement()) { s.execute(sql); }
    }
}
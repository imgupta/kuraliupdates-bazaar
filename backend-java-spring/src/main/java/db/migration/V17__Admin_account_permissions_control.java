package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/** Adds auditable account-level suspension/revocation controls for the Admin Desk. */
public class V17__Admin_account_permissions_control extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection c = context.getConnection();
        ensureColumn(c, "USERS", "ACCOUNT_STATUS", "ALTER TABLE USERS ADD ACCOUNT_STATUS VARCHAR2(20) DEFAULT 'ACTIVE' NOT NULL");
        ensureColumn(c, "USERS", "ACCOUNT_STATUS_REASON", "ALTER TABLE USERS ADD ACCOUNT_STATUS_REASON VARCHAR2(1000)");
        ensureColumn(c, "USERS", "ACCOUNT_STATUS_UPDATED_AT", "ALTER TABLE USERS ADD ACCOUNT_STATUS_UPDATED_AT TIMESTAMP");
        ensureColumn(c, "USERS", "ACCOUNT_SUSPENDED_UNTIL", "ALTER TABLE USERS ADD ACCOUNT_SUSPENDED_UNTIL TIMESTAMP");

        try (Statement st = c.createStatement()) {
            st.execute("""
                CREATE TABLE ADMIN_ACCOUNT_AUDIT (
                    AUDIT_ID VARCHAR2(64) PRIMARY KEY,
                    ACTOR_USER_ID VARCHAR2(64),
                    ACTOR_EMAIL VARCHAR2(255),
                    TARGET_USER_ID VARCHAR2(64) NOT NULL,
                    TARGET_EMAIL VARCHAR2(255),
                    ACTION VARCHAR2(30) NOT NULL,
                    PREVIOUS_STATUS VARCHAR2(20),
                    NEW_STATUS VARCHAR2(20),
                    REASON VARCHAR2(1000),
                    OCCURRED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
                )
                """);
        } catch (java.sql.SQLException ex) {
            if (!tableExists(c, "ADMIN_ACCOUNT_AUDIT")) throw ex;
        }
        ensureIndex(c, "IDX_ADMIN_AUDIT_TARGET", "CREATE INDEX IDX_ADMIN_AUDIT_TARGET ON ADMIN_ACCOUNT_AUDIT(TARGET_USER_ID, OCCURRED_AT)");
        ensureIndex(c, "IDX_ADMIN_AUDIT_ACTOR", "CREATE INDEX IDX_ADMIN_AUDIT_ACTOR ON ADMIN_ACCOUNT_AUDIT(ACTOR_USER_ID, OCCURRED_AT)");
    }

    private void ensureColumn(Connection c, String table, String column, String ddl) throws Exception {
        try (PreparedStatement ps = c.prepareStatement("SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?")) {
            ps.setString(1, table);
            ps.setString(2, column);
            try (ResultSet rs = ps.executeQuery()) { if (rs.next() && rs.getInt(1) > 0) return; }
        }
        try (Statement st = c.createStatement()) { st.execute(ddl); }
    }

    private boolean tableExists(Connection c, String table) throws Exception {
        try (PreparedStatement ps = c.prepareStatement("SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = ?")) {
            ps.setString(1, table);
            try (ResultSet rs = ps.executeQuery()) { return rs.next() && rs.getInt(1) > 0; }
        }
    }

    private void ensureIndex(Connection c, String name, String ddl) throws Exception {
        try (PreparedStatement ps = c.prepareStatement("SELECT COUNT(*) FROM USER_INDEXES WHERE INDEX_NAME = ?")) {
            ps.setString(1, name);
            try (ResultSet rs = ps.executeQuery()) { if (rs.next() && rs.getInt(1) > 0) return; }
        }
        try (Statement st = c.createStatement()) { st.execute(ddl); }
    }
}

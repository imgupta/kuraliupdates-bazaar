package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/** Adds nullable run ownership markers without changing existing production/staging rows. */
public class V15__E2eRunScopedCleanup extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection c = context.getConnection();
        ensureColumn(c, "ORDERS", "E2E_RUN_ID", "ALTER TABLE ORDERS ADD E2E_RUN_ID VARCHAR2(80)");
        ensureColumn(c, "DAILY_HELP_BOOKINGS", "E2E_RUN_ID", "ALTER TABLE DAILY_HELP_BOOKINGS ADD E2E_RUN_ID VARCHAR2(80)");
        ensureColumn(c, "NEGOTIATION_CHATS", "E2E_RUN_ID", "ALTER TABLE NEGOTIATION_CHATS ADD E2E_RUN_ID VARCHAR2(80)");
        ensureIndex(c, "IDX_ORDERS_E2E_RUN", "CREATE INDEX IDX_ORDERS_E2E_RUN ON ORDERS(E2E_RUN_ID)");
        ensureIndex(c, "IDX_DH_BOOKINGS_E2E_RUN", "CREATE INDEX IDX_DH_BOOKINGS_E2E_RUN ON DAILY_HELP_BOOKINGS(E2E_RUN_ID)");
        ensureIndex(c, "IDX_NEG_CHATS_E2E_RUN", "CREATE INDEX IDX_NEG_CHATS_E2E_RUN ON NEGOTIATION_CHATS(E2E_RUN_ID)");
    }

    private void ensureColumn(Connection c, String table, String column, String ddl) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?")) {
            ps.setString(1, table);
            ps.setString(2, column);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getInt(1) > 0) return;
            }
        }
        try (Statement st = c.createStatement()) { st.execute(ddl); }
    }

    private void ensureIndex(Connection c, String name, String ddl) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT COUNT(*) FROM USER_INDEXES WHERE INDEX_NAME = ?")) {
            ps.setString(1, name);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getInt(1) > 0) return;
            }
        }
        try (Statement st = c.createStatement()) { st.execute(ddl); }
    }
}

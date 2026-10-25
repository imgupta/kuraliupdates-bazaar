package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Establishes explicit ownership links from role profiles to USERS.
 *
 * Existing profiles are linked only where a normalized email/phone maps to
 * exactly one USERS row. Ambiguous or unmatched records are deliberately left
 * unlinked for manual review; this migration never merges or deletes profiles.
 */
public class V16__Link_role_profiles_to_users extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection c = context.getConnection();

        ensureColumn(c, "SELLERS", "USER_ID", "ALTER TABLE SELLERS ADD USER_ID VARCHAR2(64)");
        ensureColumn(c, "DELIVERY_AGENTS", "USER_ID", "ALTER TABLE DELIVERY_AGENTS ADD USER_ID VARCHAR2(64)");
        ensureColumn(c, "DAILY_HELP_PROFESSIONALS", "USER_ID", "ALTER TABLE DAILY_HELP_PROFESSIONALS ADD USER_ID VARCHAR2(64)");

        // Exact normalized email matches only; require one candidate account.
        execute(c, """
                UPDATE SELLERS s
                   SET USER_ID = (SELECT MIN(u.USER_ID) FROM USERS u
                                   WHERE LOWER(TRIM(u.EMAIL)) = LOWER(TRIM(s.EMAIL)))
                 WHERE s.USER_ID IS NULL
                   AND (SELECT COUNT(*) FROM USERS u
                         WHERE LOWER(TRIM(u.EMAIL)) = LOWER(TRIM(s.EMAIL))) = 1
                """);
        execute(c, """
                UPDATE DELIVERY_AGENTS a
                   SET USER_ID = (SELECT MIN(u.USER_ID) FROM USERS u
                                   WHERE LOWER(TRIM(u.EMAIL)) = LOWER(TRIM(a.EMAIL)))
                 WHERE a.USER_ID IS NULL
                   AND (SELECT COUNT(*) FROM USERS u
                         WHERE LOWER(TRIM(u.EMAIL)) = LOWER(TRIM(a.EMAIL))) = 1
                """);

        // Daily Help profiles are phone-based. Match digits only and require
        // a unique USERS phone; do not infer identity from names.
        execute(c, """
                UPDATE DAILY_HELP_PROFESSIONALS p
                   SET USER_ID = (SELECT MIN(u.USER_ID) FROM USERS u
                                   WHERE REGEXP_REPLACE(TRIM(u.PHONE), '[^0-9]', '') =
                                         REGEXP_REPLACE(TRIM(p.PHONE), '[^0-9]', ''))
                 WHERE p.USER_ID IS NULL
                   AND (SELECT COUNT(*) FROM USERS u
                         WHERE REGEXP_REPLACE(TRIM(u.PHONE), '[^0-9]', '') =
                               REGEXP_REPLACE(TRIM(p.PHONE), '[^0-9]', '')) = 1
                """);

        ensureIndex(c, "IDX_SELLERS_USER_ID", "CREATE INDEX IDX_SELLERS_USER_ID ON SELLERS(USER_ID)");
        ensureIndex(c, "IDX_DELIVERY_USER_ID", "CREATE INDEX IDX_DELIVERY_USER_ID ON DELIVERY_AGENTS(USER_ID)");
        ensureIndex(c, "IDX_DHP_USER_ID", "CREATE INDEX IDX_DHP_USER_ID ON DAILY_HELP_PROFESSIONALS(USER_ID)");
        ensureForeignKey(c, "FK_SELLERS_USER", "ALTER TABLE SELLERS ADD CONSTRAINT FK_SELLERS_USER FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID)");
        ensureForeignKey(c, "FK_DELIVERY_USER", "ALTER TABLE DELIVERY_AGENTS ADD CONSTRAINT FK_DELIVERY_USER FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID)");
        ensureForeignKey(c, "FK_DHP_USER", "ALTER TABLE DAILY_HELP_PROFESSIONALS ADD CONSTRAINT FK_DHP_USER FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID)");
    }

    private void execute(Connection c, String sql) throws Exception {
        try (Statement st = c.createStatement()) {
            st.executeUpdate(sql);
        }
    }

    private void ensureColumn(Connection c, String table, String column, String ddl) throws Exception {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?")) {
            ps.setString(1, table);
            ps.setString(2, column);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getInt(1) > 0) return;
            }
        }
        try (Statement st = c.createStatement()) {
            st.execute(ddl);
        }
    }

    private void ensureIndex(Connection c, String name, String ddl) throws Exception {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT COUNT(*) FROM USER_INDEXES WHERE INDEX_NAME = ?")) {
            ps.setString(1, name);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getInt(1) > 0) return;
            }
        }
        try (Statement st = c.createStatement()) {
            st.execute(ddl);
        }
    }

    private void ensureForeignKey(Connection c, String name, String ddl) throws Exception {
        try (PreparedStatement ps = c.prepareStatement(
                "SELECT COUNT(*) FROM USER_CONSTRAINTS WHERE CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'R'")) {
            ps.setString(1, name);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getInt(1) > 0) return;
            }
        }
        try (Statement st = c.createStatement()) {
            st.execute(ddl);
        }
    }
}

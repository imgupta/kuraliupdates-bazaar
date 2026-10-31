package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/** Adds availability flags while preserving availability for existing sellers and riders. */
public class V18__Seller_and_rider_availability extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        ensureColumn(connection, "SELLERS", "STORE_OPEN",
                "ALTER TABLE SELLERS ADD STORE_OPEN NUMBER(1) DEFAULT 1 NOT NULL");
        ensureColumn(connection, "DELIVERY_AGENTS", "AVAILABLE_FOR_JOBS",
                "ALTER TABLE DELIVERY_AGENTS ADD AVAILABLE_FOR_JOBS NUMBER(1) DEFAULT 1 NOT NULL");
    }

    private void ensureColumn(Connection connection, String table, String column, String ddl) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?")) {
            statement.setString(1, table);
            statement.setString(2, column);
            try (ResultSet result = statement.executeQuery()) {
                if (result.next() && result.getInt(1) > 0) return;
            }
        }
        try (Statement statement = connection.createStatement()) {
            statement.execute(ddl);
        }
    }
}

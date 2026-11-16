package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Statement;

/** Persists ward numbers for delivery and Daily Help partner registrations. */
public class V23__Partner_ward_numbers extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        addColumn(connection, "DELIVERY_AGENTS", "WARD_NUMBER", "VARCHAR2(30)");
        addColumn(connection, "DAILY_HELP_PROFESSIONALS", "WARD_NUMBER", "VARCHAR2(30)");
    }

    private void addColumn(Connection connection, String table, String column, String definition) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?")) {
            statement.setString(1, table);
            statement.setString(2, column);
            try (var result = statement.executeQuery()) {
                if (result.next() && result.getInt(1) == 0) {
                    try (Statement alter = connection.createStatement()) {
                        alter.execute("ALTER TABLE " + table + " ADD " + column + " " + definition);
                    }
                }
            }
        }
    }
}

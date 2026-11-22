package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/** Adds an optional, admin-controlled buyer ETA. Null disables ETA promises. */
public class V22__Configurable_buyer_delivery_eta extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME='DELIVERY_CONFIGURATION' AND COLUMN_NAME='ESTIMATED_DELIVERY_MINS'");
             ResultSet result = statement.executeQuery()) {
            if (result.next() && result.getInt(1) == 0) {
                try (Statement ddl = connection.createStatement()) {
                    ddl.execute("ALTER TABLE DELIVERY_CONFIGURATION ADD ESTIMATED_DELIVERY_MINS NUMBER(3)");
                }
            }
        }
    }
}

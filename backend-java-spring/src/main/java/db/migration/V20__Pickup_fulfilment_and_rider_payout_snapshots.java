package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/** Adds explicit store-pickup fulfilment and immutable rider payout snapshots. */
public class V20__Pickup_fulfilment_and_rider_payout_snapshots extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        ensureColumn(connection, "ORDERS", "FULFILMENT_MODE",
                "ALTER TABLE ORDERS ADD FULFILMENT_MODE VARCHAR2(20) DEFAULT 'DELIVERY' NOT NULL");
        ensureColumn(connection, "ORDERS", "RIDER_PAYOUT_SNAPSHOT",
                "ALTER TABLE ORDERS ADD RIDER_PAYOUT_SNAPSHOT NUMBER(10,2)");
        ensureColumn(connection, "ORDERS", "RIDER_PAYOUT_SNAPSHOTTED_AT",
                "ALTER TABLE ORDERS ADD RIDER_PAYOUT_SNAPSHOTTED_AT TIMESTAMP");
        ensureColumn(connection, "ORDERS", "COMBINED_DELIVERY_BATCH_ID",
                "ALTER TABLE ORDERS ADD COMBINED_DELIVERY_BATCH_ID VARCHAR2(64)");
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE ORDERS SET FULFILMENT_MODE='DELIVERY' WHERE FULFILMENT_MODE IS NULL");
        }
    }

    private void ensureColumn(Connection connection, String table, String column, String ddl) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME=? AND COLUMN_NAME=?")) {
            statement.setString(1, table);
            statement.setString(2, column);
            try (ResultSet result = statement.executeQuery()) {
                if (result.next() && result.getInt(1) > 0) return;
            }
        }
        try (Statement statement = connection.createStatement()) { statement.execute(ddl); }
    }
}

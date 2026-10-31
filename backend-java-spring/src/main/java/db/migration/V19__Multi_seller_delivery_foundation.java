package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/** Adds verified seller coordinates, checkout grouping and configurable multi-seller delivery settings. */
public class V19__Multi_seller_delivery_foundation extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        ensureColumn(connection, "SELLERS", "LATITUDE", "ALTER TABLE SELLERS ADD LATITUDE NUMBER(10,7)");
        ensureColumn(connection, "SELLERS", "LONGITUDE", "ALTER TABLE SELLERS ADD LONGITUDE NUMBER(10,7)");
        ensureColumn(connection, "SELLERS", "LOCATION_VERIFIED",
                "ALTER TABLE SELLERS ADD LOCATION_VERIFIED NUMBER(1) DEFAULT 0 NOT NULL");
        ensureColumn(connection, "ORDERS", "CHECKOUT_GROUP_ID", "ALTER TABLE ORDERS ADD CHECKOUT_GROUP_ID VARCHAR2(64)");
        ensureColumn(connection, "ORDERS", "FULFILMENT_STATUS", "ALTER TABLE ORDERS ADD FULFILMENT_STATUS VARCHAR2(40)");
        try (Statement statement = connection.createStatement()) {
            statement.execute("""
                CREATE TABLE DELIVERY_CONFIGURATION (
                    CONFIG_ID NUMBER(1) PRIMARY KEY,
                    NEARBY_RADIUS_KM NUMBER(5,2) DEFAULT 2 NOT NULL,
                    MAX_SELLERS_PER_BATCH NUMBER(2) DEFAULT 3 NOT NULL,
                    MAX_ROUTE_KM NUMBER(6,2) DEFAULT 8 NOT NULL,
                    CUSTOMER_BASE_FEE NUMBER(10,2) DEFAULT 35 NOT NULL,
                    CUSTOMER_PER_KM_FEE NUMBER(10,2) DEFAULT 0 NOT NULL,
                    RIDER_BASE_PAYOUT NUMBER(10,2) DEFAULT 45 NOT NULL,
                    RIDER_PER_KM_PAYOUT NUMBER(10,2) DEFAULT 22 NOT NULL,
                    MAX_WAIT_MINUTES NUMBER(3) DEFAULT 15 NOT NULL,
                    BATCH_ENABLED NUMBER(1) DEFAULT 1 NOT NULL,
                    FLEXIBLE_FALLBACK NUMBER(1) DEFAULT 1 NOT NULL,
                    STORE_PICKUP_ENABLED NUMBER(1) DEFAULT 1 NOT NULL,
                    UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
                )
                """);
        } catch (Exception alreadyExists) {
            if (!tableExists(connection, "DELIVERY_CONFIGURATION")) throw alreadyExists;
        }
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID = 1");
             ResultSet result = statement.executeQuery()) {
            if (result.next() && result.getInt(1) == 0) {
                try (Statement insert = connection.createStatement()) {
                    insert.executeUpdate("""
                        INSERT INTO DELIVERY_CONFIGURATION
                        (CONFIG_ID, NEARBY_RADIUS_KM, MAX_SELLERS_PER_BATCH, MAX_ROUTE_KM,
                         CUSTOMER_BASE_FEE, CUSTOMER_PER_KM_FEE, RIDER_BASE_PAYOUT,
                         RIDER_PER_KM_PAYOUT, MAX_WAIT_MINUTES, BATCH_ENABLED,
                         FLEXIBLE_FALLBACK, STORE_PICKUP_ENABLED, UPDATED_AT)
                        VALUES (1, 2, 3, 8, 35, 0, 45, 22, 15, 1, 1, 1, CURRENT_TIMESTAMP)
                        """);
                }
            }
        }
    }

    private boolean tableExists(Connection connection, String table) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = ?")) {
            statement.setString(1, table);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() && result.getInt(1) > 0;
            }
        }
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

package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import java.sql.*;

public class V48__Configurable_buyer_delivery_eta extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        Connection c = context.getConnection();
        try (PreparedStatement p = c.prepareStatement("SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME='DELIVERY_CONFIGURATION' AND COLUMN_NAME='ESTIMATED_DELIVERY_MINS'");
             ResultSet r = p.executeQuery()) {
            if (r.next() && r.getInt(1) == 0) try (Statement s = c.createStatement()) {
                s.execute("ALTER TABLE DELIVERY_CONFIGURATION ADD ESTIMATED_DELIVERY_MINS NUMBER(3)");
            }
        }
    }
}

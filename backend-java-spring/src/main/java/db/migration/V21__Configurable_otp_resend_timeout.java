package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/** Adds a persisted admin-configurable OTP resend cooldown, defaulting to 20 seconds. */
public class V21__Configurable_otp_resend_timeout extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME=? AND COLUMN_NAME=?")) {
            statement.setString(1, "DELIVERY_CONFIGURATION");
            statement.setString(2, "OTP_RESEND_TIMEOUT_SECONDS");
            try (ResultSet result = statement.executeQuery()) {
                if (result.next() && result.getInt(1) == 0) {
                    try (Statement ddl = connection.createStatement()) {
                        ddl.execute("ALTER TABLE DELIVERY_CONFIGURATION ADD OTP_RESEND_TIMEOUT_SECONDS NUMBER(3) DEFAULT 20 NOT NULL");
                    }
                }
            }
        }
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE DELIVERY_CONFIGURATION SET OTP_RESEND_TIMEOUT_SECONDS=20 WHERE OTP_RESEND_TIMEOUT_SECONDS IS NULL OR OTP_RESEND_TIMEOUT_SECONDS < 5 OR OTP_RESEND_TIMEOUT_SECONDS > 300");
        }
    }
}

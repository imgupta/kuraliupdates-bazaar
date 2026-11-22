package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Locale;

/** Adds customer-authorized Daily Help completion and durable helper override audit fields. */
public class V47__DailyHelpCompletionOtpAndOverride extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        ensureColumn(connection, "COMPLETION_OTP", "ALTER TABLE DAILY_HELP_BOOKINGS ADD COMPLETION_OTP VARCHAR2(10)");
        ensureColumn(connection, "COMPLETION_OTP_ATTEMPTS", "ALTER TABLE DAILY_HELP_BOOKINGS ADD COMPLETION_OTP_ATTEMPTS NUMBER(3) DEFAULT 0 NOT NULL");
        ensureColumn(connection, "COMPLETION_OTP_VERIFIED_AT", "ALTER TABLE DAILY_HELP_BOOKINGS ADD COMPLETION_OTP_VERIFIED_AT TIMESTAMP(6)");
        ensureColumn(connection, "COMPLETION_OVERRIDE_REASON", "ALTER TABLE DAILY_HELP_BOOKINGS ADD COMPLETION_OVERRIDE_REASON VARCHAR2(1000)");
        ensureColumn(connection, "COMPLETION_OVERRIDE_BY", "ALTER TABLE DAILY_HELP_BOOKINGS ADD COMPLETION_OVERRIDE_BY VARCHAR2(64)");
        ensureColumn(connection, "COMPLETION_OVERRIDE_AT", "ALTER TABLE DAILY_HELP_BOOKINGS ADD COMPLETION_OVERRIDE_AT TIMESTAMP(6)");
    }

    private void ensureColumn(Connection connection, String column, String ddl) throws Exception {
        DatabaseMetaData metadata = connection.getMetaData();
        try (ResultSet columns = metadata.getColumns(null, connection.getSchema(), "DAILY_HELP_BOOKINGS", column)) {
            if (columns.next()) return;
        }
        try (Statement statement = connection.createStatement()) {
            statement.execute(ddl);
        }
    }
}

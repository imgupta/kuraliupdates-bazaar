package com.kuraliupdates.bazaar.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicReference;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationInfoService;
import org.flywaydb.core.api.MigrationState;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;

class FlywayRecoveryConfigurationTest {

    @Test
    void schedulesMigrationWithoutBlockingTheCallingStartupThread() {
        Flyway flyway = mock(Flyway.class);
        MigrationInfoService infoService = mock(MigrationInfoService.class);
        when(flyway.info()).thenReturn(infoService);
        when(infoService.all()).thenReturn(new MigrationInfo[0]);
        DatabaseMigrationState state = new DatabaseMigrationState();
        AtomicReference<Runnable> queuedTask = new AtomicReference<>();
        Executor executor = queuedTask::set;

        FlywayRecoveryConfiguration.scheduleMigration(flyway, state, executor);

        assertEquals(DatabaseMigrationState.Status.RUNNING, state.getStatus());
        verifyNoInteractions(infoService);
        queuedTask.get().run();

        verify(flyway).migrate();
        assertEquals(DatabaseMigrationState.Status.READY, state.getStatus());
    }

    @Test
    void migrationFailureKeepsApplicationUnready() {
        Flyway flyway = mock(Flyway.class);
        when(flyway.info()).thenThrow(new IllegalStateException("sensitive database details"));
        DatabaseMigrationState state = new DatabaseMigrationState();

        FlywayRecoveryConfiguration.scheduleMigration(flyway, state, Runnable::run);

        assertEquals(DatabaseMigrationState.Status.FAILED, state.getStatus());
        assertEquals("IllegalStateException", state.getFailureType());
        verify(flyway, never()).migrate();
    }

    @Test
    void repairsOnlyKnownFailedV30ThenMigrates() {
        Flyway flyway = mock(Flyway.class);
        MigrationInfoService infoService = mock(MigrationInfoService.class);
        MigrationInfo failedV30 = mock(MigrationInfo.class);
        when(flyway.info()).thenReturn(infoService);
        when(infoService.all()).thenReturn(new MigrationInfo[]{failedV30});
        when(failedV30.getState()).thenReturn(MigrationState.FAILED);
        when(failedV30.getVersion()).thenReturn(MigrationVersion.fromVersion("30"));

        FlywayRecoveryConfiguration.migrateWithKnownV30Recovery(flyway);

        verify(flyway).repair();
        verify(flyway).migrate();
    }

    @Test
    void doesNotRepairWhenThereAreNoFailedMigrations() {
        Flyway flyway = mock(Flyway.class);
        MigrationInfoService infoService = mock(MigrationInfoService.class);
        when(flyway.info()).thenReturn(infoService);
        when(infoService.all()).thenReturn(new MigrationInfo[0]);

        FlywayRecoveryConfiguration.migrateWithKnownV30Recovery(flyway);

        verify(flyway, never()).repair();
        verify(flyway).migrate();
    }

    @Test
    void refusesToRepairAnyOtherFailedMigration() {
        Flyway flyway = mock(Flyway.class);
        MigrationInfoService infoService = mock(MigrationInfoService.class);
        MigrationInfo failedV29 = mock(MigrationInfo.class);
        when(flyway.info()).thenReturn(infoService);
        when(infoService.all()).thenReturn(new MigrationInfo[]{failedV29});
        when(failedV29.getState()).thenReturn(MigrationState.FAILED);
        when(failedV29.getVersion()).thenReturn(MigrationVersion.fromVersion("29"));

        assertThrows(IllegalStateException.class,
                () -> FlywayRecoveryConfiguration.migrateWithKnownV30Recovery(flyway));

        verify(flyway, never()).repair();
        verify(flyway, never()).migrate();
    }
}

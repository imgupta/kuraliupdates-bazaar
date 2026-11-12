package com.kuraliupdates.bazaar.config;

import org.springframework.stereotype.Component;

/**
 * Process-local state for the startup Flyway migration.
 *
 * The HTTP listener may bind while Flyway runs, but application traffic remains
 * gated until the migration completes successfully. Failure details are kept
 * to a class name only so health responses never expose connection or schema data.
 */
@Component
public class DatabaseMigrationState {
    public enum Status {
        NOT_STARTED,
        RUNNING,
        READY,
        FAILED
    }

    private volatile Status status = Status.NOT_STARTED;
    private volatile String failureType;

    public void markRunning() {
        failureType = null;
        status = Status.RUNNING;
    }

    public void markReady() {
        failureType = null;
        status = Status.READY;
    }

    public void markFailed(Throwable failure) {
        failureType = failure == null ? "Unknown" : failure.getClass().getSimpleName();
        status = Status.FAILED;
    }

    public boolean isReady() {
        return status == Status.READY;
    }

    public Status getStatus() {
        return status;
    }

    public String getFailureType() {
        return failureType;
    }
}

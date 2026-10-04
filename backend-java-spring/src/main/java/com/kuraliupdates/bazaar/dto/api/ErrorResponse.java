package com.kuraliupdates.bazaar.dto.api;

import java.time.Instant;

public record ErrorResponse(
        boolean success,
        String message,
        String code,
        Instant timestamp
) {
    public static ErrorResponse of(String message, String code) {
        return new ErrorResponse(false, message, code, Instant.now());
    }
}

package com.kuraliupdates.bazaar.util;

/** Shared string normalization helpers preserving the semantics used by existing services. */
public final class Strings {
    private Strings() {
    }

    /** Returns null only for null input; otherwise returns the trimmed value. */
    public static String trim(String value) {
        return value == null ? null : value.trim();
    }

    /** Returns null for null or blank input; otherwise returns the trimmed value. */
    public static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

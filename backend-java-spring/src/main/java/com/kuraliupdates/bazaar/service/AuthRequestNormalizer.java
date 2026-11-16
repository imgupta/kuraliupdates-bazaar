package com.kuraliupdates.bazaar.service;

import java.util.Set;

/**
 * Pure input normalization shared by the authentication workflow.
 * This class deliberately has no persistence, clock, OTP, or transaction dependencies.
 */
public final class AuthRequestNormalizer {
    private static final Set<String> CONTACT_TYPES = Set.of("EMAIL", "PHONE");
    private static final Set<String> ROLES = Set.of("BUYER", "SELLER", "DELIVERY", "PROFESSIONAL");

    private AuthRequestNormalizer() {}

    public static String normalizeType(String identifier, String requested) {
        String inferred = identifier.contains("@") ? "EMAIL" : "PHONE";
        if (requested == null || requested.isBlank()) return inferred;
        String normalized = requested.trim().toUpperCase();
        return CONTACT_TYPES.contains(normalized) ? normalized : inferred;
    }

    public static String normalizeMode(String mode) {
        return "REGISTER".equalsIgnoreCase(mode) ? "REGISTER" : "LOGIN";
    }

    public static String normalizeRole(String role) {
        String normalized = role == null ? "BUYER" : role.trim().toUpperCase();
        return ROLES.contains(normalized) ? normalized : "BUYER";
    }

    public static String normalizeIdentifier(String value, String type) {
        if (value == null) return "";
        return "EMAIL".equals(type) ? value.trim().toLowerCase() : value.trim().replaceAll("\\D", "");
    }

    public static String mask(String value) {
        if (value.contains("@")) {
            int at = value.indexOf("@");
            return value.charAt(0) + "***" + value.substring(Math.max(at - 1, 1));
        }
        return value.length() <= 4 ? "****" : "******" + value.substring(value.length() - 4);
    }
}

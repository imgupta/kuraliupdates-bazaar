package com.kuraliupdates.bazaar.service;

/** Compares phone identities using digits only, matching the normalization used at registration. */
public final class PhoneIdentityMatcher {
    private PhoneIdentityMatcher() {}

    public static boolean matches(String left, String right) {
        if (left == null || right == null) return false;
        return left.replaceAll("\\D", "").equals(right.replaceAll("\\D", ""));
    }
}

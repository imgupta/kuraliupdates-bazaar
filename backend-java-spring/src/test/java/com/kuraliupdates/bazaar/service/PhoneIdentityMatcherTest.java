package com.kuraliupdates.bazaar.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PhoneIdentityMatcherTest {
    @Test
    void matchesFormattedAndUnformattedPhoneNumbers() {
        assertTrue(PhoneIdentityMatcher.matches("+91 98765-43210", "919876543210"));
        assertTrue(PhoneIdentityMatcher.matches("(98765) 43210", "9876543210"));
    }

    @Test
    void rejectsMissingOrDifferentPhoneNumbers() {
        assertFalse(PhoneIdentityMatcher.matches(null, "9876543210"));
        assertFalse(PhoneIdentityMatcher.matches("9876543210", null));
        assertFalse(PhoneIdentityMatcher.matches("9876543210", "9876543211"));
    }
}

package com.kuraliupdates.bazaar.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AuthRequestNormalizerTest {
    @Test
    void infersAndNormalizesContactType() {
        assertEquals("EMAIL", AuthRequestNormalizer.normalizeType(" Person@Example.com ", null));
        assertEquals("PHONE", AuthRequestNormalizer.normalizeType("+91 98765 43210", "invalid"));
        assertEquals("PHONE", AuthRequestNormalizer.normalizeType("person@example.com", " PHONE "));
    }

    @Test
    void normalizesModeAndRoleWithSafeDefaults() {
        assertEquals("REGISTER", AuthRequestNormalizer.normalizeMode("register"));
        assertEquals("LOGIN", AuthRequestNormalizer.normalizeMode("unexpected"));
        assertEquals("SELLER", AuthRequestNormalizer.normalizeRole(" seller "));
        assertEquals("BUYER", AuthRequestNormalizer.normalizeRole("unknown"));
        assertEquals("BUYER", AuthRequestNormalizer.normalizeRole(null));
    }

    @Test
    void normalizesIdentifiersAndMasksContactDetails() {
        assertEquals("person@example.com", AuthRequestNormalizer.normalizeIdentifier(" Person@Example.COM ", "EMAIL"));
        assertEquals("919876543210", AuthRequestNormalizer.normalizeIdentifier("+91 98765-43210", "PHONE"));
        assertEquals("", AuthRequestNormalizer.normalizeIdentifier(null, "EMAIL"));
        assertEquals("p***n@example.com", AuthRequestNormalizer.mask("person@example.com"));
        assertEquals("******3210", AuthRequestNormalizer.mask("919876543210"));
        assertEquals("****", AuthRequestNormalizer.mask("1234"));
    }
}

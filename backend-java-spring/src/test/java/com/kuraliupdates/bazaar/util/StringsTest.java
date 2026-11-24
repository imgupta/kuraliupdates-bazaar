package com.kuraliupdates.bazaar.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class StringsTest {
    @Test
    void trimPreservesNullAndReturnsEmptyStringForWhitespace() {
        assertNull(Strings.trim(null));
        assertEquals("", Strings.trim(" \t "));
        assertEquals("value", Strings.trim("  value  "));
    }

    @Test
    void blankToNullReturnsNullForNullOrWhitespace() {
        assertNull(Strings.blankToNull(null));
        assertNull(Strings.blankToNull(" \t "));
        assertEquals("value", Strings.blankToNull("  value  "));
    }
}

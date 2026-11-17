package com.kuraliupdates.bazaar.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DailyHelpOtpGeneratorTest {
    private final DailyHelpOtpGenerator generator = new DailyHelpOtpGenerator();

    @Test
    void generatesFourDigitOtpIncludingLeadingZeroes() {
        for (int attempt = 0; attempt < 100; attempt++) {
            assertTrue(generator.generate().matches("\\d{4}"));
        }
    }
}

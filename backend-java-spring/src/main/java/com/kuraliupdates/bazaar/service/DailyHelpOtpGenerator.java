package com.kuraliupdates.bazaar.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/** Generates the four-digit customer/professional Daily Help booking OTP. */
@Component
public class DailyHelpOtpGenerator {
    private final SecureRandom random = new SecureRandom();

    public String generate() {
        return String.format("%04d", random.nextInt(10000));
    }
}

package com.kuraliupdates.bazaar.dto.dailyhelp;

import java.math.BigDecimal;

public record DailyHelpProfessionalEarningsResponse(
        BigDecimal today,
        BigDecimal lifetime,
        long completedBookings
) {}

package com.kuraliupdates.bazaar.dto.dailyhelp;

import java.util.List;

public record DailyHelpProfessionalDashboardResponse(
        DailyHelpProfessionalResponse professional,
        DailyHelpProfessionalEarningsResponse earnings,
        List<DailyHelpBookingResponse> jobs
) {}

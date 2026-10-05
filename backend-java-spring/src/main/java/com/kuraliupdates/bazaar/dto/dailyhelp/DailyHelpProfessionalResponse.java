package com.kuraliupdates.bazaar.dto.dailyhelp;

import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalEntity;

public record DailyHelpProfessionalResponse(
        String professionalId,
        String fullName,
        String phone,
        String rating,
        Integer reviewCount,
        String currentLocality,
        String status,
        boolean verified
) {
    public static DailyHelpProfessionalResponse from(DailyHelpProfessionalEntity p) {
        return new DailyHelpProfessionalResponse(
                p.getProfessionalId(), p.getFullName(), p.getPhone(),
                p.getRating() == null ? "0.00" : p.getRating().toPlainString(),
                p.getReviewCount(), p.getCurrentLocality(), p.getStatus(),
                Integer.valueOf(1).equals(p.getVerified()));
    }
}

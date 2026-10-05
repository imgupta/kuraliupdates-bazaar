package com.kuraliupdates.bazaar.dto.dailyhelp;

import com.kuraliupdates.bazaar.entity.DailyHelpServiceEntity;
import java.math.BigDecimal;

public record DailyHelpServiceResponse(
        String id,
        String category,
        String name,
        String description,
        String pricingUnit,
        BigDecimal pricePerHour,
        Integer minHours,
        String imageUrl,
        boolean active
) {
    public static DailyHelpServiceResponse from(DailyHelpServiceEntity s) {
        return new DailyHelpServiceResponse(
                s.getServiceId(), s.getCategory(), s.getName(), s.getDescription(),
                s.getPricingUnit(), s.getPricePerHour(), s.getMinHours(), s.getImageUrl(),
                Integer.valueOf(1).equals(s.getActive())
        );
    }
}

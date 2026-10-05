package com.kuraliupdates.bazaar.dto.dailyhelp;

import com.kuraliupdates.bazaar.entity.DailyHelpServiceEntity;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record DailyHelpServiceAdminResponse(
        String id, String category, String name, String description, String pricingUnit,
        BigDecimal pricePerHour, Integer minHours, String imageUrl, Integer active,
        LocalDateTime createdAt, LocalDateTime updatedAt
) {
    public static DailyHelpServiceAdminResponse from(DailyHelpServiceEntity s) {
        return new DailyHelpServiceAdminResponse(s.getServiceId(), s.getCategory(), s.getName(), s.getDescription(),
                s.getPricingUnit(), s.getPricePerHour(), s.getMinHours(), s.getImageUrl(), s.getActive(),
                s.getCreatedAt(), s.getUpdatedAt());
    }
}

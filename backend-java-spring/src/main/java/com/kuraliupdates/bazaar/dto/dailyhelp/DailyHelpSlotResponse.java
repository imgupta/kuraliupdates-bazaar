package com.kuraliupdates.bazaar.dto.dailyhelp;

import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalSlotEntity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record DailyHelpSlotResponse(
        String slotId,
        String professionalId,
        String professionalName,
        String locality,
        LocalDate slotDate,
        LocalTime startTime,
        LocalTime endTime,
        String status,
        String bookingId,
        String rating
) {
    public static DailyHelpSlotResponse from(DailyHelpProfessionalSlotEntity s) {
        BigDecimal rating = s.getProfessional().getRating();
        return new DailyHelpSlotResponse(
                s.getSlotId(),
                s.getProfessional().getProfessionalId(),
                s.getProfessional().getFullName(),
                s.getProfessional().getCurrentLocality(),
                s.getSlotDate(),
                s.getStartTime(),
                s.getEndTime(),
                s.getStatus(),
                s.getBookingId(),
                rating == null ? "0.00" : rating.toPlainString()
        );
    }
}
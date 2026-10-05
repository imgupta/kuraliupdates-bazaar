package com.kuraliupdates.bazaar.dto.dailyhelp;

import com.kuraliupdates.bazaar.entity.DailyHelpBookingEntity;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record DailyHelpBookingResponse(
        String id,
        String serviceId,
        String serviceName,
        String buyerName,
        String buyerPhone,
        String address,
        String locality,
        LocalDateTime scheduledStart,
        BigDecimal requestedHours,
        BigDecimal hourlyRate,
        BigDecimal estimatedTotal,
        String status,
        String professionalId,
        String professionalName,
        String professionalPhone,
        String startOtp,
        LocalDateTime otpVerifiedAt,
        LocalDateTime serviceStartedAt,
        LocalDateTime serviceCompletedAt
) {
    public static DailyHelpBookingResponse from(DailyHelpBookingEntity b, boolean exposeOtp) {
        return new DailyHelpBookingResponse(
                b.getBookingId(), b.getService().getServiceId(), b.getService().getName(),
                b.getBuyerName(), b.getBuyerPhone(), b.getAddress(), b.getLocality(),
                b.getScheduledStart(), b.getRequestedHours(), b.getHourlyRate(), b.getEstimatedTotal(),
                b.getStatus(),
                b.getProfessional() == null ? null : b.getProfessional().getProfessionalId(),
                b.getProfessional() == null ? null : b.getProfessional().getFullName(),
                b.getProfessional() == null ? null : b.getProfessional().getPhone(),
                exposeOtp ? b.getStartOtp() : null,
                b.getOtpVerifiedAt(), b.getServiceStartedAt(), b.getServiceCompletedAt()
        );
    }
}

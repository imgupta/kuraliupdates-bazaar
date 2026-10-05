package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpStartRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpServiceResponse;
import com.kuraliupdates.bazaar.entity.DailyHelpBookingEntity;
import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalEntity;
import com.kuraliupdates.bazaar.entity.DailyHelpServiceEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.DailyHelpBookingRepository;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalRepository;
import com.kuraliupdates.bazaar.repository.DailyHelpServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DailyHelpService {
    private final DailyHelpServiceRepository serviceRepository;
    private final DailyHelpProfessionalRepository professionalRepository;
    private final DailyHelpBookingRepository bookingRepository;
    private final SecureRandom random = new SecureRandom();

    @Transactional(readOnly = true)
    public List<DailyHelpServiceResponse> getActiveServices() {
        return serviceRepository.findByActiveOrderByCategoryAscNameAsc(1).stream().map(DailyHelpServiceResponse::from).toList();
    }

    @Transactional
    public DailyHelpBookingResponse createBooking(DailyHelpBookingRequest request) {
        DailyHelpServiceEntity service = serviceRepository.findById(request.serviceId())
                .filter(s -> Integer.valueOf(1).equals(s.getActive()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help service not found"));

        if (request.requestedHours().compareTo(BigDecimal.valueOf(service.getMinHours())) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Minimum booking is " + service.getMinHours() + " hours");
        }

        LocalDateTime now = LocalDateTime.now();
        DailyHelpProfessionalEntity professional = professionalRepository
                .findFirstByStatusAndVerifiedAndCurrentLocalityIgnoreCaseOrderByRatingDesc(
                        "AVAILABLE", 1, request.locality().trim())
                .orElse(null);

        DailyHelpBookingEntity booking = DailyHelpBookingEntity.builder()
                .bookingId("DH-KUR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .service(service)
                .professional(professional)
                .buyerName(request.buyerName().trim())
                .buyerPhone(request.buyerPhone().trim())
                .address(request.address().trim())
                .locality(request.locality().trim())
                .scheduledStart(request.scheduledStart())
                .requestedHours(request.requestedHours())
                .hourlyRate(service.getPricePerHour())
                .estimatedTotal(service.getPricePerHour().multiply(request.requestedHours()))
                .status(professional == null ? "SEARCHING" : "PROFESSIONAL_ASSIGNED")
                .startOtp(generateOtp())
                .createdAt(now)
                .updatedAt(now)
                .build();

        DailyHelpBookingEntity saved = bookingRepository.save(booking);
        return DailyHelpBookingResponse.from(saved, shouldExposeOtp(saved));
    }

    @Transactional(readOnly = true)
    public DailyHelpBookingResponse getLatestBooking(String buyerPhone) {
        return bookingRepository.findFirstByBuyerPhoneOrderByCreatedAtDesc(buyerPhone.trim())
                .map(b -> DailyHelpBookingResponse.from(b, shouldExposeOtp(b)))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public DailyHelpBookingResponse getBooking(String bookingId) {
        DailyHelpBookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help booking not found"));
        return DailyHelpBookingResponse.from(booking, shouldExposeOtp(booking));
    }

    @Transactional
    public DailyHelpBookingResponse updateStatus(String bookingId, String professionalId, String status) {
        DailyHelpBookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help booking not found"));
        if (booking.getProfessional() == null || !booking.getProfessional().getProfessionalId().equals(professionalId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Professional is not assigned to this booking");
        }
        if (!List.of("ARRIVING", "READY_TO_START").contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported Daily Help status");
        }
        booking.setStatus(status);
        booking.setUpdatedAt(LocalDateTime.now());
        return DailyHelpBookingResponse.from(bookingRepository.save(booking), true);
    }

    @Transactional
    public DailyHelpBookingResponse startBooking(String bookingId, DailyHelpStartRequest request) {
        DailyHelpBookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help booking not found"));

        if (booking.getProfessional() == null ||
                !booking.getProfessional().getProfessionalId().equals(request.professionalId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Professional is not assigned to this booking");
        }
        if (!request.otp().trim().equals(booking.getStartOtp())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid service start OTP");
        }
        if ("IN_PROGRESS".equals(booking.getStatus())) {
            return DailyHelpBookingResponse.from(booking, false);
        }
        if (!List.of("PROFESSIONAL_ASSIGNED", "ARRIVING", "READY_TO_START").contains(booking.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Booking is not ready to start");
        }

        LocalDateTime now = LocalDateTime.now();
        booking.setOtpVerifiedAt(now);
        booking.setServiceStartedAt(now);
        booking.setStatus("IN_PROGRESS");
        booking.setUpdatedAt(now);
        DailyHelpBookingEntity saved = bookingRepository.save(booking);
        return DailyHelpBookingResponse.from(saved, false);
    }

    @Transactional
    public DailyHelpBookingResponse completeBooking(String bookingId, String professionalId) {
        DailyHelpBookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help booking not found"));
        if (booking.getProfessional() == null || !booking.getProfessional().getProfessionalId().equals(professionalId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Professional is not assigned to this booking");
        }
        if (!"IN_PROGRESS".equals(booking.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Booking is not in progress");
        }
        LocalDateTime now = LocalDateTime.now();
        booking.setServiceCompletedAt(now);
        booking.setStatus("COMPLETED");
        booking.setUpdatedAt(now);
        return DailyHelpBookingResponse.from(bookingRepository.save(booking), false);
    }

    private boolean shouldExposeOtp(DailyHelpBookingEntity booking) {
        return "ARRIVING".equals(booking.getStatus()) || "READY_TO_START".equals(booking.getStatus());
    }

    private String generateOtp() {
        return String.format("%04d", random.nextInt(10000));
    }
}

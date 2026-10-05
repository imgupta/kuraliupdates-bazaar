package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpStartRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalAvailabilityRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalEarningsResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalRegistrationRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalResponse;
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
import java.util.ArrayList;

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

        // New bookings enter SEARCHING so verified professionals can explicitly accept them.
        DailyHelpBookingEntity booking = DailyHelpBookingEntity.builder()
                .bookingId("DH-KUR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .service(service)
                .professional(null)
                .buyerName(request.buyerName().trim())
                .buyerPhone(request.buyerPhone().trim())
                .address(request.address().trim())
                .locality(request.locality().trim())
                .scheduledStart(request.scheduledStart())
                .requestedHours(request.requestedHours())
                .hourlyRate(service.getPricePerHour())
                .estimatedTotal(service.getPricePerHour().multiply(request.requestedHours()))
                .status("SEARCHING")
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

    @Transactional
    public DailyHelpProfessionalResponse registerProfessional(DailyHelpProfessionalRegistrationRequest request) {
        String phone = request.phone().trim().replaceAll("\\D", "");
        if (professionalRepository.findByPhone(phone).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "A Daily Help professional already exists with this mobile number");
        }
        LocalDateTime now = LocalDateTime.now();
        DailyHelpProfessionalEntity professional = DailyHelpProfessionalEntity.builder()
                .professionalId("DHP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .fullName(request.name().trim())
                .phone(phone)
                .rating(BigDecimal.ZERO)
                .reviewCount(0)
                .currentLocality(request.locality().trim())
                .status("OFFLINE")
                .verified(1)
                .registeredAt(now)
                .updatedAt(now)
                .build();
        return DailyHelpProfessionalResponse.from(professionalRepository.save(professional));
    }

    @Transactional(readOnly = true)
    public DailyHelpProfessionalResponse getProfessionalByPhone(String phone) {
        return professionalRepository.findByPhone(phone.trim().replaceAll("\\D", ""))
                .map(DailyHelpProfessionalResponse::from)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help professional profile not found"));
    }

    @Transactional
    public DailyHelpProfessionalResponse updateProfessionalAvailability(
            String professionalId, DailyHelpProfessionalAvailabilityRequest request) {
        DailyHelpProfessionalEntity professional = getProfessionalEntity(professionalId);
        String status = request.status().trim().toUpperCase();
        if (!List.of("AVAILABLE", "OFFLINE").contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Availability must be AVAILABLE or OFFLINE");
        }
        if (request.locality() != null && !request.locality().isBlank()) {
            professional.setCurrentLocality(request.locality().trim());
        }
        professional.setStatus(status);
        professional.setUpdatedAt(LocalDateTime.now());
        return DailyHelpProfessionalResponse.from(professionalRepository.save(professional));
    }

    @Transactional(readOnly = true)
    public List<DailyHelpBookingResponse> getAvailableJobs(String professionalId) {
        DailyHelpProfessionalEntity professional = getProfessionalEntity(professionalId);
        if (!"AVAILABLE".equals(professional.getStatus())) {
            return List.of();
        }
        return bookingRepository
                .findByStatusAndLocalityIgnoreCaseAndProfessionalIsNullOrderByScheduledStartAsc(
                        "SEARCHING", professional.getCurrentLocality())
                .stream()
                .map(b -> DailyHelpBookingResponse.from(b, false))
                .toList();
    }

    @Transactional
    public DailyHelpBookingResponse acceptJob(String professionalId, String bookingId) {
        DailyHelpProfessionalEntity professional = getProfessionalEntity(professionalId);
        if (!"AVAILABLE".equals(professional.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Set yourself as available before accepting a job");
        }

        DailyHelpBookingEntity booking = bookingRepository.findLockedByBookingId(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help booking not found"));
        if (!"SEARCHING".equals(booking.getStatus()) || booking.getProfessional() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "This Daily Help job has already been assigned");
        }
        if (!professional.getCurrentLocality().equalsIgnoreCase(booking.getLocality())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Job is outside your current service locality");
        }

        booking.setProfessional(professional);
        booking.setStatus("PROFESSIONAL_ASSIGNED");
        booking.setUpdatedAt(LocalDateTime.now());
        return DailyHelpBookingResponse.from(bookingRepository.save(booking), false);
    }

    @Transactional(readOnly = true)
    public List<DailyHelpBookingResponse> getProfessionalJobs(String professionalId) {
        getProfessionalEntity(professionalId);
        return bookingRepository.findByProfessionalProfessionalIdOrderByScheduledStartDesc(professionalId)
                .stream()
                .map(b -> DailyHelpBookingResponse.from(b, "ARRIVING".equals(b.getStatus()) || "READY_TO_START".equals(b.getStatus())))
                .toList();
    }

    @Transactional(readOnly = true)
    public DailyHelpProfessionalEarningsResponse getProfessionalEarnings(String professionalId) {
        getProfessionalEntity(professionalId);
        List<DailyHelpBookingEntity> completed = bookingRepository
                .findByProfessionalProfessionalIdAndStatusOrderByScheduledStartDesc(professionalId, "COMPLETED");
        BigDecimal lifetime = completed.stream()
                .map(DailyHelpBookingEntity::getEstimatedTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        BigDecimal today = completed.stream()
                .filter(b -> b.getServiceCompletedAt() != null && !b.getServiceCompletedAt().isBefore(startOfDay))
                .map(DailyHelpBookingEntity::getEstimatedTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new DailyHelpProfessionalEarningsResponse(today, lifetime, completed.size());
    }

    private DailyHelpProfessionalEntity getProfessionalEntity(String professionalId) {
        return professionalRepository.findById(professionalId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help professional not found"));
    }

    private boolean shouldExposeOtp(DailyHelpBookingEntity booking) {
        return "ARRIVING".equals(booking.getStatus()) || "READY_TO_START".equals(booking.getStatus());
    }

    private String generateOtp() {
        return String.format("%04d", random.nextInt(10000));
    }
}

package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpStartRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalAvailabilityRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalEarningsResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalRegistrationRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpServiceResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpServiceAdminRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpServiceAdminResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpSlotRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpSlotResponse;
import com.kuraliupdates.bazaar.entity.DailyHelpBookingEntity;
import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalEntity;
import com.kuraliupdates.bazaar.entity.DailyHelpServiceEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.DailyHelpBookingRepository;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalRepository;
import com.kuraliupdates.bazaar.repository.DailyHelpServiceRepository;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalSlotRepository;
import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalSlotEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class DailyHelpService {
    private final DailyHelpServiceRepository serviceRepository;
    private final DailyHelpProfessionalRepository professionalRepository;
    private final DailyHelpBookingRepository bookingRepository;
    private final DailyHelpProfessionalSlotRepository slotRepository;
    private final SecureRandom random = new SecureRandom();

    @Transactional(readOnly = true)
    public List<DailyHelpServiceResponse> getActiveServices() {
        return serviceRepository.findByActiveOrderByCategoryAscNameAsc(1).stream().map(DailyHelpServiceResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<DailyHelpServiceAdminResponse> getAllServicesForAdmin() {
        return serviceRepository.findAll(org.springframework.data.domain.Sort.by("category").ascending().and(org.springframework.data.domain.Sort.by("name").ascending()))
                .stream().map(DailyHelpServiceAdminResponse::from).toList();
    }

    @Transactional
    public DailyHelpServiceAdminResponse createService(DailyHelpServiceAdminRequest request) {
        String id = "DH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        LocalDateTime now = LocalDateTime.now();
        DailyHelpServiceEntity service = DailyHelpServiceEntity.builder()
                .serviceId(id).category(request.category().trim()).name(request.name().trim())
                .description(request.description() == null ? null : request.description().trim())
                .pricingUnit(request.pricingUnit().trim().toUpperCase()).pricePerHour(request.pricePerHour())
                .minHours(request.minHours()).imageUrl(request.imageUrl()).active(request.active())
                .createdAt(now).updatedAt(now).build();
        return DailyHelpServiceAdminResponse.from(serviceRepository.save(service));
    }

    @Transactional
    public DailyHelpServiceAdminResponse updateService(String serviceId, DailyHelpServiceAdminRequest request) {
        DailyHelpServiceEntity service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help service not found"));
        service.setCategory(request.category().trim()); service.setName(request.name().trim());
        service.setDescription(request.description() == null ? null : request.description().trim());
        service.setPricingUnit(request.pricingUnit().trim().toUpperCase()); service.setPricePerHour(request.pricePerHour());
        service.setMinHours(request.minHours()); service.setImageUrl(request.imageUrl()); service.setActive(request.active());
        service.setUpdatedAt(LocalDateTime.now());
        return DailyHelpServiceAdminResponse.from(serviceRepository.save(service));
    }

    @Transactional
    public DailyHelpBookingResponse createBooking(DailyHelpBookingRequest request) {
        DailyHelpServiceEntity service = serviceRepository.findById(request.serviceId())
                .filter(s -> Integer.valueOf(1).equals(s.getActive()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help service not found"));

        if (request.requestedHours().compareTo(BigDecimal.valueOf(service.getMinHours())) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Minimum booking is " + service.getMinHours() + " hours");
        }

        if (request.slotId() == null || request.slotId().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please select an available maid slot");
        }

        DailyHelpProfessionalSlotEntity slot = slotRepository.findLockedBySlotId(request.slotId().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Selected Daily Help slot was not found"));

        if (!"AVAILABLE".equals(slot.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "This slot is already booked. Please select a different slot.");
        }
        DailyHelpProfessionalEntity professional = slot.getProfessional();
        if (!Integer.valueOf(1).equals(professional.getVerified())) {
            throw new ApiException(HttpStatus.CONFLICT, "Selected Daily Help professional is not currently verified");
        }
        if (request.locality() != null && !request.locality().isBlank()
                && professional.getCurrentLocality() != null
                && !professional.getCurrentLocality().equalsIgnoreCase(request.locality().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "Selected professional is not available in your locality");
        }

        LocalDateTime slotStart = slot.getSlotDate().atTime(slot.getStartTime());
        LocalDateTime slotEnd = slot.getSlotDate().atTime(slot.getEndTime());
        long slotMinutes = Duration.between(slotStart, slotEnd).toMinutes();
        long requestedMinutes = request.requestedHours().multiply(BigDecimal.valueOf(60)).longValueExact();

        if (!slotStart.equals(request.scheduledStart())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please select the exact start time of the chosen slot");
        }
        if (slotMinutes != requestedMinutes) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Selected slot duration does not match the requested booking duration");
        }
        if (slotStart.isBefore(LocalDateTime.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Selected slot has already started. Please choose a future slot.");
        }

        LocalDateTime now = LocalDateTime.now();
        DailyHelpBookingEntity booking = DailyHelpBookingEntity.builder()
                .bookingId("DH-KUR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .service(service)
                .professional(professional)
                .buyerName(request.buyerName().trim())
                .buyerPhone(request.buyerPhone().trim())
                .address(request.address().trim())
                .locality(request.locality() == null ? professional.getCurrentLocality() : request.locality().trim())
                .scheduledStart(slotStart)
                .requestedHours(request.requestedHours())
                .hourlyRate(service.getPricePerHour())
                .estimatedTotal(service.getPricePerHour().multiply(request.requestedHours()))
                .status("PROFESSIONAL_ASSIGNED")
                .startOtp(generateOtp())
                .otpExpiresAt(now.plusMinutes(15))
                .otpAttempts(0)
                .createdAt(now)
                .updatedAt(now)
                .build();

        slot.setStatus("BOOKED");
        slot.setBookingId(booking.getBookingId());
        slot.setUpdatedAt(now);
        slotRepository.save(slot);

        DailyHelpBookingEntity saved = bookingRepository.save(booking);
        return DailyHelpBookingResponse.from(saved, shouldExposeOtp(saved));
    }

    @Transactional(readOnly = true)
    public List<DailyHelpSlotResponse> getAvailableSlots(LocalDate date, String locality, BigDecimal requestedHours) {
        if (date == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Booking date is required");
        if (requestedHours == null || requestedHours.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Booking duration must be greater than zero");
        }

        LocalDateTime now = LocalDateTime.now();
        return slotRepository.findAvailableForDate(date, locality == null || locality.isBlank() ? null : locality.trim(), LocalTime.MIN, LocalTime.MAX)
                .stream()
                .filter(s -> {
                    LocalDateTime start = s.getSlotDate().atTime(s.getStartTime());
                    LocalDateTime end = s.getSlotDate().atTime(s.getEndTime());
                    long minutes = Duration.between(start, end).toMinutes();
                    long requestedMinutes = requestedHours.multiply(BigDecimal.valueOf(60)).longValue();
                    return !start.isBefore(now) && minutes == requestedMinutes;
                })
                .map(DailyHelpSlotResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DailyHelpSlotResponse> getProfessionalSlots(String professionalId, LocalDate date) {
        getProfessionalEntity(professionalId);
        return slotRepository.findByProfessionalProfessionalIdAndSlotDateOrderByStartTimeAsc(professionalId, date)
                .stream().map(DailyHelpSlotResponse::from).toList();
    }

    @Transactional
    public DailyHelpSlotResponse createProfessionalSlot(String professionalId, DailyHelpSlotRequest request) {
        DailyHelpProfessionalEntity professional = getProfessionalEntity(professionalId);
        if (request.slotDate().isBefore(LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Slot date must be today or a future date");
        }
        if (!request.endTime().isAfter(request.startTime())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Slot end time must be after start time");
        }
        if (request.slotDate().equals(LocalDate.now()) && request.startTime().isBefore(LocalTime.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Slot start time must be in the future");
        }

        List<DailyHelpProfessionalSlotEntity> existing =
                slotRepository.findByProfessionalProfessionalIdAndSlotDateOrderByStartTimeAsc(professionalId, request.slotDate());
        boolean overlaps = existing.stream().anyMatch(s ->
                !"CANCELLED".equals(s.getStatus())
                        && request.startTime().isBefore(s.getEndTime())
                        && request.endTime().isAfter(s.getStartTime()));
        if (overlaps) {
            throw new ApiException(HttpStatus.CONFLICT, "This timing overlaps an existing slot");
        }

        LocalDateTime now = LocalDateTime.now();
        DailyHelpProfessionalSlotEntity slot = DailyHelpProfessionalSlotEntity.builder()
                .slotId("DHS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .professional(professional)
                .slotDate(request.slotDate())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .status("AVAILABLE")
                .createdAt(now)
                .updatedAt(now)
                .build();
        return DailyHelpSlotResponse.from(slotRepository.save(slot));
    }

    @Transactional
    public DailyHelpSlotResponse cancelProfessionalSlot(String professionalId, String slotId) {
        DailyHelpProfessionalSlotEntity slot = slotRepository.findLockedBySlotId(slotId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help slot not found"));
        if (!slot.getProfessional().getProfessionalId().equals(professionalId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only manage your own Daily Help slots");
        }
        if ("BOOKED".equals(slot.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "A booked slot cannot be removed");
        }
        slot.setStatus("CANCELLED");
        slot.setUpdatedAt(LocalDateTime.now());
        return DailyHelpSlotResponse.from(slotRepository.save(slot));
    }

    @Transactional(readOnly = true)
    public DailyHelpBookingResponse getLatestBooking(String buyerPhone) {
        return bookingRepository.findFirstByBuyerPhoneOrderByCreatedAtDesc(buyerPhone.trim())
                .map(b -> DailyHelpBookingResponse.from(b, shouldExposeOtp(b)))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public DailyHelpBookingResponse getBookingForUser(String bookingId, com.kuraliupdates.bazaar.entity.UserEntity user) {
        DailyHelpBookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Daily Help booking not found"));
        String role = user.getRole() == null ? "" : user.getRole().toUpperCase();
        boolean buyerOwns = "BUYER".equals(role) && samePhone(user.getPhone(), booking.getBuyerPhone());
        boolean professionalOwns = "PROFESSIONAL".equals(role)
                && booking.getProfessional() != null
                && samePhone(user.getPhone(), booking.getProfessional().getPhone());
        if (!buyerOwns && !professionalOwns) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this Daily Help booking");
        }
        return DailyHelpBookingResponse.from(booking, buyerOwns && shouldExposeOtp(booking));
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
        if ("IN_PROGRESS".equals(booking.getStatus())) {
            return DailyHelpBookingResponse.from(booking, false);
        }
        if (booking.getOtpVerifiedAt() != null || booking.getStartOtp() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Service start OTP has already been used");
        }
        LocalDateTime now = LocalDateTime.now();
        if (booking.getOtpExpiresAt() == null || now.isAfter(booking.getOtpExpiresAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Service start OTP has expired");
        }
        int attempts = booking.getOtpAttempts() == null ? 0 : booking.getOtpAttempts();
        if (attempts >= 5) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many invalid OTP attempts");
        }
        if (!request.otp().trim().equals(booking.getStartOtp())) {
            booking.setOtpAttempts(attempts + 1);
            booking.setUpdatedAt(now);
            bookingRepository.save(booking);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid service start OTP");
        }
        if (!List.of("PROFESSIONAL_ASSIGNED", "ARRIVING", "READY_TO_START").contains(booking.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Booking is not ready to start");
        }

        booking.setOtpVerifiedAt(now);
        booking.setStartOtp(null);
        booking.setOtpExpiresAt(null);
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
        Optional<DailyHelpProfessionalEntity> existing = professionalRepository.findByPhone(phone);
        if (existing.isPresent()) {
            DailyHelpProfessionalEntity professional = existing.get();
            professional.setFullName(request.name().trim());
            professional.setCurrentLocality(request.locality().trim());
            professional.setUpdatedAt(LocalDateTime.now());
            return DailyHelpProfessionalResponse.from(professionalRepository.save(professional));
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
                .map(b -> DailyHelpBookingResponse.from(b, false))
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

    private boolean samePhone(String left, String right) {
        if (left == null || right == null) return false;
        return left.replaceAll("\\D", "").equals(right.replaceAll("\\D", ""));
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

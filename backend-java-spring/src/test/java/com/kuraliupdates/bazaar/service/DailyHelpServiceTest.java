package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpStartRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpCompleteRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpSlotRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalRegistrationRequest;
import com.kuraliupdates.bazaar.entity.DailyHelpBookingEntity;
import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalEntity;
import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalSlotEntity;
import com.kuraliupdates.bazaar.entity.DailyHelpServiceEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.DailyHelpBookingRepository;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalRepository;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalSlotRepository;
import com.kuraliupdates.bazaar.repository.DailyHelpServiceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DailyHelpServiceTest {
    @Mock private DailyHelpServiceRepository serviceRepository;
    @Mock private DailyHelpProfessionalRepository professionalRepository;
    @Mock private DailyHelpBookingRepository bookingRepository;
    @Mock private DailyHelpProfessionalSlotRepository slotRepository;
    @Mock private JdbcTemplate jdbcTemplate;
    @InjectMocks private DailyHelpService dailyHelpService;

    @org.junit.jupiter.api.BeforeEach
    void defaultTurnaroundBuffer() {
        lenient().when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(15);
    }

    @Test
    void fullDayAvailabilityRemainsBookableAfterMidnightHasPassed() {
        LocalDate date = LocalDate.of(2026, 11, 25);
        LocalDateTime windowStart = date.atStartOfDay();
        LocalDateTime windowEnd = date.atTime(23, 59);
        LocalDateTime now = date.atTime(11, 45);

        assertTrue(DailyHelpService.hasBookableWindow(windowStart, windowEnd, now, 60));
    }

    @Test
    void availabilityRejectsWindowWithoutEnoughRemainingTime() {
        LocalDate date = LocalDate.of(2026, 11, 25);
        LocalDateTime windowStart = date.atStartOfDay();
        LocalDateTime windowEnd = date.atTime(12, 45);
        LocalDateTime now = date.atTime(12, 0);

        assertFalse(DailyHelpService.hasBookableWindow(windowStart, windowEnd, now, 60));
    }

    @Test
    void futureAvailabilityWindowUsesItsConfiguredStartTime() {
        LocalDate date = LocalDate.of(2026, 11, 25);
        LocalDateTime windowStart = date.atTime(9, 0);
        LocalDateTime windowEnd = date.atTime(17, 0);
        LocalDateTime now = date.minusDays(1).atTime(18, 0);

        assertTrue(DailyHelpService.hasBookableWindow(windowStart, windowEnd, now, 60));
    }

    @Test
    void nullBookingRequestReturnsBadRequestBeforeRepositoryAccess() {
        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.createBooking(null));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(serviceRepository, professionalRepository, bookingRepository, slotRepository);
    }

    @Test
    void nullStartRequestReturnsBadRequestBeforeBookingLookup() {
        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.startBooking("BOOK-1", null));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(bookingRepository);
    }

    @Test
    void malformedStartOtpIsRejectedBeforeBookingLookup() {
        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.startBooking("BOOK-1",
                        new DailyHelpStartRequest("DHP-1", "not-an-otp")));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(bookingRepository);
    }

    @Test
    void bookingRejectsSlotAlreadyBooked() {
        DailyHelpServiceEntity service = service();
        DailyHelpProfessionalEntity professional = professional();
        DailyHelpProfessionalSlotEntity slot = slot(professional, "BOOKED");
        when(serviceRepository.findById("DH-CLEAN")).thenReturn(Optional.of(service));
        when(slotRepository.findLockedBySlotId("SLOT-1")).thenReturn(Optional.of(slot));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.createBooking(request(slot.getSlotDate().atTime(slot.getStartTime()))));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(bookingRepository, never()).save(any());
        verify(slotRepository, never()).save(any());
    }

    @Test
    void bookingReservesSlotAndPersistsBookingInSameUseCase() {
        DailyHelpServiceEntity service = service();
        DailyHelpProfessionalEntity professional = professional();
        DailyHelpProfessionalSlotEntity slot = slot(professional, "AVAILABLE");
        LocalDateTime start = slot.getSlotDate().atTime(slot.getStartTime());
        when(serviceRepository.findById("DH-CLEAN")).thenReturn(Optional.of(service));
        when(slotRepository.findLockedBySlotId("SLOT-1")).thenReturn(Optional.of(slot));
        when(professionalRepository.findLockedByProfessionalId("DHP-1")).thenReturn(Optional.of(professional));
        when(bookingRepository.save(any(DailyHelpBookingEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = dailyHelpService.createBooking(request(start));

        assertEquals("AVAILABLE", slot.getStatus());
        assertNull(slot.getBookingId());
        assertEquals("PROFESSIONAL_ASSIGNED", response.status());
        assertEquals("DHP-1", response.professionalId());
        verify(slotRepository, never()).save(any());
        verify(bookingRepository).save(any(DailyHelpBookingEntity.class));
    }

    @Test
    void secondBookingAttemptCannotReuseTheSameReservedSlot() {
        DailyHelpServiceEntity service = service();
        DailyHelpProfessionalEntity professional = professional();
        DailyHelpProfessionalSlotEntity slot = slot(professional, "AVAILABLE");
        LocalDateTime start = slot.getSlotDate().atTime(slot.getStartTime());
        when(serviceRepository.findById("DH-CLEAN")).thenReturn(Optional.of(service));
        when(slotRepository.findLockedBySlotId("SLOT-1")).thenReturn(Optional.of(slot));
        when(professionalRepository.findLockedByProfessionalId("DHP-1")).thenReturn(Optional.of(professional));
        java.util.List<DailyHelpBookingEntity> persisted = new java.util.ArrayList<>();
        when(bookingRepository.findByProfessionalProfessionalIdAndScheduledStartGreaterThanEqualAndScheduledStartLessThanOrderByScheduledStartAsc(
                eq("DHP-1"), any(LocalDateTime.class), any(LocalDateTime.class))).thenAnswer(invocation -> persisted);
        when(bookingRepository.save(any(DailyHelpBookingEntity.class))).thenAnswer(invocation -> {
            DailyHelpBookingEntity saved = invocation.getArgument(0);
            persisted.add(saved);
            return saved;
        });

        dailyHelpService.createBooking(request(start));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.createBooking(request(start)));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("AVAILABLE", slot.getStatus());
        assertNull(slot.getBookingId());
        verify(slotRepository, never()).save(any());
        verify(bookingRepository, times(1)).save(any(DailyHelpBookingEntity.class));
    }

    @Test
    void sameBuyerCanBookDifferentProfessionalsForTheSameTimeAsSeparateOrders() {
        DailyHelpServiceEntity service = service();
        DailyHelpProfessionalEntity firstProfessional = professional();
        DailyHelpProfessionalEntity secondProfessional = DailyHelpProfessionalEntity.builder()
                .professionalId("DHP-2").fullName("Second Professional").phone("9876500001")
                .currentLocality("Kurali").status("AVAILABLE").verified(1).build();
        DailyHelpProfessionalSlotEntity firstSlot = slot(firstProfessional, "AVAILABLE");
        DailyHelpProfessionalSlotEntity secondSlot = DailyHelpProfessionalSlotEntity.builder()
                .slotId("SLOT-2").professional(secondProfessional).slotDate(firstSlot.getSlotDate())
                .startTime(firstSlot.getStartTime()).endTime(firstSlot.getEndTime()).status("AVAILABLE").build();
        LocalDateTime start = firstSlot.getSlotDate().atTime(firstSlot.getStartTime());
        when(serviceRepository.findById("DH-CLEAN")).thenReturn(Optional.of(service));
        when(slotRepository.findLockedBySlotId("SLOT-1")).thenReturn(Optional.of(firstSlot));
        when(slotRepository.findLockedBySlotId("SLOT-2")).thenReturn(Optional.of(secondSlot));
        when(professionalRepository.findLockedByProfessionalId("DHP-1")).thenReturn(Optional.of(firstProfessional));
        when(professionalRepository.findLockedByProfessionalId("DHP-2")).thenReturn(Optional.of(secondProfessional));
        when(bookingRepository.save(any(DailyHelpBookingEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var firstOrder = dailyHelpService.createBooking(request(start));
        var secondOrder = dailyHelpService.createBooking(new DailyHelpBookingRequest(
                "DH-CLEAN", "Buyer", "9876543210", "House 1", "Kurali",
                start, BigDecimal.valueOf(2), "SLOT-2"));

        assertEquals("DHP-1", firstOrder.professionalId());
        assertEquals("DHP-2", secondOrder.professionalId());
        assertNotEquals(firstOrder.id(), secondOrder.id());
        verify(bookingRepository, times(2)).save(any(DailyHelpBookingEntity.class));
        verify(slotRepository, never()).save(any());
    }

    @Test
    void professionalCannotCancelAnotherProfessionalsSlot() {
        DailyHelpProfessionalSlotEntity slot = slot(professional(), "AVAILABLE");
        when(slotRepository.findLockedBySlotId("SLOT-1")).thenReturn(Optional.of(slot));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.cancelProfessionalSlot("DHP-OTHER", "SLOT-1"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals("AVAILABLE", slot.getStatus());
        verify(slotRepository, never()).save(any());
    }

    @Test
    void overlappingProfessionalSlotsAreRejected() {
        DailyHelpProfessionalEntity professional = professional();
        LocalDate date = LocalDate.now().plusDays(2);
        DailyHelpProfessionalSlotEntity existing = DailyHelpProfessionalSlotEntity.builder()
                .slotId("EXISTING").professional(professional).slotDate(date)
                .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(12, 0))
                .status("AVAILABLE").build();
        when(professionalRepository.findLockedByProfessionalId("DHP-1")).thenReturn(Optional.of(professional));
        when(slotRepository.findByProfessionalProfessionalIdAndSlotDateOrderByStartTimeAsc("DHP-1", date))
                .thenReturn(java.util.List.of(existing));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.createProfessionalSlot("DHP-1",
                        new DailyHelpSlotRequest(date, LocalTime.of(11, 0), LocalTime.of(13, 0))));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(slotRepository, never()).save(any());
    }

    @Test
    void invalidStartOtpIncrementsAndSavesAttemptBeforeReturningError() {
        DailyHelpProfessionalEntity professional = professional();
        LocalDateTime now = LocalDateTime.now();
        DailyHelpBookingEntity booking = DailyHelpBookingEntity.builder()
                .bookingId("BOOK-1")
                .service(service())
                .professional(professional)
                .buyerName("Buyer")
                .buyerPhone("9876543210")
                .address("Kurali")
                .locality("Kurali")
                .scheduledStart(now.plusDays(1))
                .requestedHours(BigDecimal.ONE)
                .hourlyRate(BigDecimal.valueOf(100))
                .estimatedTotal(BigDecimal.valueOf(100))
                .status("PROFESSIONAL_ASSIGNED")
                .startOtp("1234")
                .otpExpiresAt(now.plusMinutes(10))
                .otpAttempts(0)
                .completionOtpAttempts(0)
                .createdAt(now)
                .updatedAt(now)
                .build();
        when(bookingRepository.findLockedByBookingId("BOOK-1")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(DailyHelpBookingEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.startBooking("BOOK-1", new DailyHelpStartRequest("DHP-1", "0000")));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals(1, booking.getOtpAttempts());
        verify(bookingRepository).save(booking);
    }

    @Test
    void selfRegistrationCreatesUnverifiedOfflineProfessional() {
        when(professionalRepository.findByPhone("9876500000")).thenReturn(Optional.empty());
        when(professionalRepository.save(any(DailyHelpProfessionalEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = dailyHelpService.registerProfessional(
                new DailyHelpProfessionalRegistrationRequest("New Helper", "9876500000", "Kurali", "4"));

        assertFalse(response.verified(), "self-registration must not bypass admin verification");
        assertEquals("OFFLINE", response.status());
        verify(professionalRepository).save(argThat(p -> Integer.valueOf(0).equals(p.getVerified())
                && "OFFLINE".equals(p.getStatus())
                && "4".equals(p.getWardNumber())));
    }

    @Test
    void adminApprovalVerifiesProfessionalWithoutMakingItAvailable() {
        DailyHelpProfessionalEntity professional = professional();
        professional.setVerified(0);
        professional.setStatus("OFFLINE");
        when(professionalRepository.findById("DHP-1")).thenReturn(Optional.of(professional));
        when(professionalRepository.save(any(DailyHelpProfessionalEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = dailyHelpService.updateProfessionalVerification("DHP-1", true);

        assertTrue(response.verified());
        assertEquals("OFFLINE", response.status(), "verification must not opt the professional into accepting jobs");
        verify(professionalRepository).save(professional);
    }

    @Test
    void adminRevokingVerificationForcesProfessionalOffline() {
        DailyHelpProfessionalEntity professional = professional();
        professional.setStatus("AVAILABLE");
        when(professionalRepository.findById("DHP-1")).thenReturn(Optional.of(professional));
        when(professionalRepository.save(any(DailyHelpProfessionalEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = dailyHelpService.updateProfessionalVerification("DHP-1", false);

        assertFalse(response.verified());
        assertEquals("OFFLINE", response.status());
        verify(professionalRepository).save(professional);
    }

    @Test
    void unverifiedProfessionalCannotBeSetAvailable() {
        DailyHelpProfessionalEntity professional = professional();
        professional.setVerified(0);
        when(professionalRepository.findById("DHP-1")).thenReturn(Optional.of(professional));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.updateProfessionalAvailability("DHP-1",
                        new com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalAvailabilityRequest("AVAILABLE", "Kurali")));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(professionalRepository, never()).save(any());
    }

    @Test
    void bookingRejectsUnverifiedProfessionalEvenWhenSlotIsAvailable() {
        DailyHelpServiceEntity service = service();
        DailyHelpProfessionalEntity professional = professional();
        professional.setVerified(0);
        DailyHelpProfessionalSlotEntity slot = slot(professional, "AVAILABLE");
        when(serviceRepository.findById("DH-CLEAN")).thenReturn(Optional.of(service));
        when(slotRepository.findLockedBySlotId("SLOT-1")).thenReturn(Optional.of(slot));
        when(professionalRepository.findLockedByProfessionalId("DHP-1")).thenReturn(Optional.of(professional));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.createBooking(request(slot.getSlotDate().atTime(slot.getStartTime()))));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(bookingRepository, never()).save(any());
        verify(slotRepository, never()).save(any());
    }

    @Test
    void professionalProfileOwnerCanReadBookingWithBuyerPrimaryRole() {
        LocalDateTime now = LocalDateTime.now();
        DailyHelpBookingEntity booking = DailyHelpBookingEntity.builder()
                .bookingId("BOOK-PROVIDER-1")
                .service(service())
                .professional(professional())
                .buyerName("Booking Buyer")
                .buyerPhone("9876543210")
                .address("House 1")
                .locality("Kurali")
                .scheduledStart(now.plusDays(1))
                .requestedHours(BigDecimal.ONE)
                .hourlyRate(BigDecimal.valueOf(100))
                .estimatedTotal(BigDecimal.valueOf(100))
                .status("PROFESSIONAL_ASSIGNED")
                .otpAttempts(0)
                .createdAt(now)
                .updatedAt(now)
                .build();
        UserEntity providerAccount = UserEntity.builder()
                .userId("USER-PROVIDER-1")
                .phone("98765-00000")
                .role("BUYER")
                .build();
        when(bookingRepository.findById("BOOK-PROVIDER-1")).thenReturn(Optional.of(booking));

        var response = dailyHelpService.getBookingForUser("BOOK-PROVIDER-1", providerAccount);

        assertEquals("BOOK-PROVIDER-1", response.id());
        assertEquals("DHP-1", response.professionalId());
    }

    @Test
    void unrelatedBuyerCannotReadAnotherProfessionalsBooking() {
        LocalDateTime now = LocalDateTime.now();
        DailyHelpBookingEntity booking = DailyHelpBookingEntity.builder()
                .bookingId("BOOK-PROVIDER-2")
                .service(service())
                .professional(professional())
                .buyerName("Booking Buyer")
                .buyerPhone("9876543210")
                .address("House 1")
                .locality("Kurali")
                .scheduledStart(now.plusDays(1))
                .requestedHours(BigDecimal.ONE)
                .hourlyRate(BigDecimal.valueOf(100))
                .estimatedTotal(BigDecimal.valueOf(100))
                .status("PROFESSIONAL_ASSIGNED")
                .otpAttempts(0)
                .createdAt(now)
                .updatedAt(now)
                .build();
        UserEntity unrelatedBuyer = UserEntity.builder()
                .userId("USER-OTHER-1")
                .phone("9876501111")
                .role("BUYER")
                .build();
        when(bookingRepository.findById("BOOK-PROVIDER-2")).thenReturn(Optional.of(booking));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.getBookingForUser("BOOK-PROVIDER-2", unrelatedBuyer));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
    }

    @Test
    void unassignedProfessionalCannotChangeBookingStatus() {
        DailyHelpBookingEntity booking = booking("BOOK-STATUS-OWNER", "PROFESSIONAL_ASSIGNED");
        when(bookingRepository.findLockedByBookingId("BOOK-STATUS-OWNER")).thenReturn(Optional.of(booking));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.updateStatus("BOOK-STATUS-OWNER", "DHP-OTHER", "ARRIVING"));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(bookingRepository, never()).save(any());
        assertEquals("PROFESSIONAL_ASSIGNED", booking.getStatus());
    }

    @Test
    void unassignedProfessionalCannotStartBookingEvenWithCorrectOtp() {
        DailyHelpBookingEntity booking = booking("BOOK-START-OWNER", "READY_TO_START");
        booking.setStartOtp("1234");
        booking.setOtpExpiresAt(LocalDateTime.now().plusMinutes(10));
        booking.setOtpAttempts(0);
        when(bookingRepository.findLockedByBookingId("BOOK-START-OWNER")).thenReturn(Optional.of(booking));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.startBooking("BOOK-START-OWNER",
                        new DailyHelpStartRequest("DHP-OTHER", "1234")));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(bookingRepository, never()).save(any());
        assertEquals("READY_TO_START", booking.getStatus());
        assertEquals("1234", booking.getStartOtp());
        assertNull(booking.getOtpVerifiedAt());
    }

    @Test
    void replayingConsumedStartOtpIsIdempotentAndDoesNotResetStartTimestamp() {
        LocalDateTime startedAt = LocalDateTime.now().minusMinutes(7);
        DailyHelpBookingEntity booking = booking("BOOK-START-REPLAY", "IN_PROGRESS");
        booking.setStartOtp(null);
        booking.setOtpExpiresAt(null);
        booking.setOtpVerifiedAt(startedAt);
        booking.setServiceStartedAt(startedAt);
        when(bookingRepository.findLockedByBookingId("BOOK-START-REPLAY")).thenReturn(Optional.of(booking));

        var response = dailyHelpService.startBooking("BOOK-START-REPLAY",
                new DailyHelpStartRequest("DHP-1", "1234"));

        assertEquals("IN_PROGRESS", response.status());
        assertEquals(startedAt, response.serviceStartedAt());
        assertNull(booking.getStartOtp());
        assertEquals(startedAt, booking.getServiceStartedAt());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void completionTimestampIsNormalizedToOracleMicrosecondPrecision() {
        DailyHelpBookingEntity booking = booking("BOOK-COMPLETE-PRECISION", "IN_PROGRESS");
        booking.setCompletionOtp("5678");
        booking.setCompletionOtpAttempts(0);
        when(bookingRepository.findLockedByBookingId("BOOK-COMPLETE-PRECISION")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(DailyHelpBookingEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = dailyHelpService.completeBooking("BOOK-COMPLETE-PRECISION", new DailyHelpCompleteRequest("DHP-1", "5678", null));

        assertEquals("COMPLETED", response.status());
        assertNotNull(response.serviceCompletedAt());
        assertEquals(0, response.serviceCompletedAt().getNano() % 1_000,
                "completion timestamp must be representable by Oracle TIMESTAMP(6)");
        assertEquals(booking.getServiceCompletedAt(), response.serviceCompletedAt());
        verify(bookingRepository).save(booking);
    }

    @Test
    void completionRequiresCustomerOtpOrReasonedOverride() {
        DailyHelpBookingEntity booking = booking("BOOK-END-OTP", "IN_PROGRESS");
        booking.setCompletionOtp("5678");
        when(bookingRepository.findLockedByBookingId("BOOK-END-OTP")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(DailyHelpBookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ApiException missing = assertThrows(ApiException.class,
                () -> dailyHelpService.completeBooking("BOOK-END-OTP", new DailyHelpCompleteRequest("DHP-1", null, null)));
        assertEquals(HttpStatus.BAD_REQUEST, missing.getStatus());
        assertEquals("IN_PROGRESS", booking.getStatus());

        ApiException wrong = assertThrows(ApiException.class,
                () -> dailyHelpService.completeBooking("BOOK-END-OTP", new DailyHelpCompleteRequest("DHP-1", "0000", null)));
        assertEquals(HttpStatus.BAD_REQUEST, wrong.getStatus());
        assertEquals(1, booking.getCompletionOtpAttempts());
        assertEquals("IN_PROGRESS", booking.getStatus());
    }

    @Test
    void helperOverrideRequiresReasonAndPersistsActorAndTimestamp() {
        DailyHelpBookingEntity booking = booking("BOOK-END-OVERRIDE", "IN_PROGRESS");
        booking.setCompletionOtp("5678");
        when(bookingRepository.findLockedByBookingId("BOOK-END-OVERRIDE")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(DailyHelpBookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = dailyHelpService.completeBooking("BOOK-END-OVERRIDE",
                new DailyHelpCompleteRequest("DHP-1", null, "Customer phone unavailable"));

        assertEquals("COMPLETED", response.status());
        assertEquals("Customer phone unavailable", booking.getCompletionOverrideReason());
        assertEquals("DHP-1", booking.getCompletionOverrideBy());
        assertNotNull(booking.getCompletionOverrideAt());
        assertNull(booking.getCompletionOtp());
    }

    @Test
    void unassignedProfessionalCannotCompleteBooking() {
        DailyHelpBookingEntity booking = booking("BOOK-COMPLETE-OWNER", "IN_PROGRESS");
        when(bookingRepository.findLockedByBookingId("BOOK-COMPLETE-OWNER")).thenReturn(Optional.of(booking));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.completeBooking("BOOK-COMPLETE-OWNER", new DailyHelpCompleteRequest("DHP-OTHER", "5678", null)));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(bookingRepository, never()).save(any());
        assertEquals("IN_PROGRESS", booking.getStatus());
        assertNull(booking.getServiceCompletedAt());
    }

 
    @Test
    void professionalStatusMutationNeverReturnsBuyerStartOtp() {
        DailyHelpBookingEntity booking = booking("BOOK-STATUS-OTP", "PROFESSIONAL_ASSIGNED");
        booking.setStartOtp("4821");
        when(bookingRepository.findLockedByBookingId("BOOK-STATUS-OTP")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(DailyHelpBookingEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = dailyHelpService.updateStatus("BOOK-STATUS-OTP", "DHP-1", "ARRIVING");

        assertEquals("ARRIVING", response.status());
        assertNull(response.startOtp(), "the professional must not receive the buyer-held service-start OTP");
        verify(bookingRepository).findLockedByBookingId("BOOK-STATUS-OTP");
        verify(bookingRepository).save(booking);
    }

    @Test
    void statusTransitionCannotSkipArrivingOrReopenCompletedBooking() {
        DailyHelpBookingEntity assigned = booking("BOOK-SKIP-ARRIVING", "PROFESSIONAL_ASSIGNED");
        when(bookingRepository.findLockedByBookingId("BOOK-SKIP-ARRIVING")).thenReturn(Optional.of(assigned));
        ApiException skipped = assertThrows(ApiException.class,
                () -> dailyHelpService.updateStatus("BOOK-SKIP-ARRIVING", "DHP-1", "READY_TO_START"));
        assertEquals(HttpStatus.CONFLICT, skipped.getStatus());
        assertEquals("PROFESSIONAL_ASSIGNED", assigned.getStatus());

        DailyHelpBookingEntity completed = booking("BOOK-REOPEN", "COMPLETED");
        when(bookingRepository.findLockedByBookingId("BOOK-REOPEN")).thenReturn(Optional.of(completed));
        ApiException reopened = assertThrows(ApiException.class,
                () -> dailyHelpService.updateStatus("BOOK-REOPEN", "DHP-1", "ARRIVING"));
        assertEquals(HttpStatus.CONFLICT, reopened.getStatus());
        assertEquals("COMPLETED", completed.getStatus());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void repeatedCurrentStatusIsIdempotentAndDoesNotExposeOtp() {
        DailyHelpBookingEntity booking = booking("BOOK-STATUS-REPLAY", "READY_TO_START");
        booking.setStartOtp("4821");
        when(bookingRepository.findLockedByBookingId("BOOK-STATUS-REPLAY")).thenReturn(Optional.of(booking));

        var response = dailyHelpService.updateStatus("BOOK-STATUS-REPLAY", "DHP-1", "ready_to_start");

        assertEquals("READY_TO_START", response.status());
        assertNull(response.startOtp());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void buyerCanCancelOwnFutureBookingBeforeServiceStarts() {
        DailyHelpBookingEntity booking = booking("BOOK-CANCEL-OWN", "PROFESSIONAL_ASSIGNED");
        booking.setStartOtp("4821");
        when(bookingRepository.findLockedByBookingId("BOOK-CANCEL-OWN")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(DailyHelpBookingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        UserEntity buyer = UserEntity.builder().userId("USER-1").phone("9876543210").role("BUYER").build();

        var response = dailyHelpService.cancelBookingForBuyer("BOOK-CANCEL-OWN", buyer);

        assertEquals("CANCELLED_BY_BUYER", response.status());
        assertNull(response.startOtp());
        assertNull(booking.getStartOtp());
        assertNull(booking.getOtpExpiresAt());
        verify(bookingRepository).save(booking);
    }

    @Test
    void buyerCannotCancelAnotherBuyersBooking() {
        DailyHelpBookingEntity booking = booking("BOOK-CANCEL-OTHER", "PROFESSIONAL_ASSIGNED");
        when(bookingRepository.findLockedByBookingId("BOOK-CANCEL-OTHER")).thenReturn(Optional.of(booking));
        UserEntity other = UserEntity.builder().userId("USER-2").phone("9999999999").role("BUYER").build();

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.cancelBookingForBuyer("BOOK-CANCEL-OTHER", other));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void buyerCannotCancelStartedBooking() {
        DailyHelpBookingEntity booking = booking("BOOK-CANCEL-STARTED", "IN_PROGRESS");
        booking.setServiceStartedAt(LocalDateTime.now().minusMinutes(1));
        when(bookingRepository.findLockedByBookingId("BOOK-CANCEL-STARTED")).thenReturn(Optional.of(booking));
        UserEntity buyer = UserEntity.builder().userId("USER-1").phone("9876543210").role("BUYER").build();

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.cancelBookingForBuyer("BOOK-CANCEL-STARTED", buyer));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void bookingRejectsDurationBelowServiceMinimumBeforeSlotLookup() {
        DailyHelpServiceEntity service = service();
        service.setMinHours(3);
        when(serviceRepository.findById("DH-CLEAN")).thenReturn(Optional.of(service));
        LocalDateTime start = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")).plusDays(2).atTime(10, 0);

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.createBooking(new DailyHelpBookingRequest(
                        "DH-CLEAN", "Buyer", "9876543210", "House 1", "Kurali",
                        start, BigDecimal.valueOf(2), "SLOT-1")));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(slotRepository, professionalRepository, bookingRepository);
    }

    @Test
    void bookingRejectsDurationThatIsNotAQuarterHourIncrementBeforeSlotLookup() {
        when(serviceRepository.findById("DH-CLEAN")).thenReturn(Optional.of(service()));
        LocalDateTime start = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata")).plusDays(2).atTime(10, 0);

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.createBooking(new DailyHelpBookingRequest(
                        "DH-CLEAN", "Buyer", "9876543210", "House 1", "Kurali",
                        start, new BigDecimal("1.1"), "SLOT-1")));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verifyNoInteractions(slotRepository, professionalRepository, bookingRepository);
    }

    @Test
    void availabilityRejectsOutOfRangeOrNonQuarterHourDurationsBeforeQuery() {
        ApiException tooLong = assertThrows(ApiException.class,
                () -> dailyHelpService.getAvailableSlots(LocalDate.now().plusDays(1), "Kurali", BigDecimal.valueOf(13)));
        ApiException fractional = assertThrows(ApiException.class,
                () -> dailyHelpService.getAvailableSlots(LocalDate.now().plusDays(1), "Kurali", new BigDecimal("1.1")));

        assertEquals(HttpStatus.BAD_REQUEST, tooLong.getStatus());
        assertEquals(HttpStatus.BAD_REQUEST, fractional.getStatus());
        verifyNoInteractions(slotRepository);
    }

    private DailyHelpBookingRequest request(LocalDateTime start) {
        return new DailyHelpBookingRequest("DH-CLEAN", "Buyer", "9876543210", "House 1", "Kurali",
                start, BigDecimal.valueOf(2), "SLOT-1");
    }

    private DailyHelpBookingEntity booking(String bookingId, String status) {
        LocalDateTime now = LocalDateTime.now();
        return DailyHelpBookingEntity.builder()
                .bookingId(bookingId)
                .service(service())
                .professional(professional())
                .buyerName("Booking Buyer")
                .buyerPhone("9876543210")
                .address("House 1")
                .locality("Kurali")
                .scheduledStart(now.plusDays(1))
                .requestedHours(BigDecimal.ONE)
                .hourlyRate(BigDecimal.valueOf(100))
                .estimatedTotal(BigDecimal.valueOf(100))
                .status(status)
                .otpAttempts(0)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    private DailyHelpServiceEntity service() {
        return DailyHelpServiceEntity.builder()
                .serviceId("DH-CLEAN").name("Cleaning").category("Home")
                .pricingUnit("HOUR").pricePerHour(BigDecimal.valueOf(100))
                .minHours(1).active(1).build();
    }

    private DailyHelpProfessionalEntity professional() {
        return DailyHelpProfessionalEntity.builder()
                .professionalId("DHP-1").fullName("Professional").phone("9876500000")
                .currentLocality("Kurali").status("AVAILABLE").verified(1).build();
    }

    private DailyHelpProfessionalSlotEntity slot(DailyHelpProfessionalEntity professional, String status) {
        LocalDate date = LocalDate.now().plusDays(2);
        return DailyHelpProfessionalSlotEntity.builder()
                .slotId("SLOT-1").professional(professional).slotDate(date)
                .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(12, 0))
                .status(status).build();
    }
}

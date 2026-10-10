package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpStartRequest;
import com.kuraliupdates.bazaar.entity.DailyHelpBookingEntity;
import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalEntity;
import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalSlotEntity;
import com.kuraliupdates.bazaar.entity.DailyHelpServiceEntity;
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
    @InjectMocks private DailyHelpService dailyHelpService;

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
        when(slotRepository.save(any(DailyHelpProfessionalSlotEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingRepository.save(any(DailyHelpBookingEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = dailyHelpService.createBooking(request(start));

        assertEquals("BOOKED", slot.getStatus());
        assertNotNull(slot.getBookingId());
        assertEquals("PROFESSIONAL_ASSIGNED", response.status());
        assertEquals("DHP-1", response.professionalId());
        verify(slotRepository).save(slot);
        verify(bookingRepository).save(any(DailyHelpBookingEntity.class));
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
                .createdAt(now)
                .updatedAt(now)
                .build();
        when(bookingRepository.findById("BOOK-1")).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(DailyHelpBookingEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ApiException error = assertThrows(ApiException.class,
                () -> dailyHelpService.startBooking("BOOK-1", new DailyHelpStartRequest("DHP-1", "0000")));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals(1, booking.getOtpAttempts());
        verify(bookingRepository).save(booking);
    }

    private DailyHelpBookingRequest request(LocalDateTime start) {
        return new DailyHelpBookingRequest("DH-CLEAN", "Buyer", "9876543210", "House 1", "Kurali",
                start, BigDecimal.valueOf(2), "SLOT-1");
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

package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpStartRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpStatusRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpServiceResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalAvailabilityRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalRegistrationRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalEarningsResponse;
import com.kuraliupdates.bazaar.service.DailyHelpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/daily-help")
@RequiredArgsConstructor
public class DailyHelpController {
    private final DailyHelpService dailyHelpService;

    @GetMapping("/services")
    public ResponseEntity<List<DailyHelpServiceResponse>> services() {
        return ResponseEntity.ok(dailyHelpService.getActiveServices());
    }

    @PostMapping("/bookings")
    public ResponseEntity<DailyHelpBookingResponse> createBooking(
            @Valid @RequestBody DailyHelpBookingRequest request) {
        return ResponseEntity.ok(dailyHelpService.createBooking(request));
    }

    @PostMapping("/professionals/register")
    public ResponseEntity<DailyHelpProfessionalResponse> registerProfessional(
            @Valid @RequestBody DailyHelpProfessionalRegistrationRequest request) {
        return ResponseEntity.ok(dailyHelpService.registerProfessional(request));
    }

    @GetMapping("/professionals/by-phone/{phone}")
    public ResponseEntity<DailyHelpProfessionalResponse> professionalByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(dailyHelpService.getProfessionalByPhone(phone));
    }

    @PostMapping("/professionals/{professionalId}/availability")
    public ResponseEntity<DailyHelpProfessionalResponse> availability(
            @PathVariable String professionalId,
            @Valid @RequestBody DailyHelpProfessionalAvailabilityRequest request) {
        return ResponseEntity.ok(dailyHelpService.updateProfessionalAvailability(professionalId, request));
    }

    @GetMapping("/professionals/{professionalId}/jobs/available")
    public ResponseEntity<List<DailyHelpBookingResponse>> availableJobs(@PathVariable String professionalId) {
        return ResponseEntity.ok(dailyHelpService.getAvailableJobs(professionalId));
    }

    @PostMapping("/professionals/{professionalId}/jobs/{bookingId}/accept")
    public ResponseEntity<DailyHelpBookingResponse> acceptJob(
            @PathVariable String professionalId, @PathVariable String bookingId) {
        return ResponseEntity.ok(dailyHelpService.acceptJob(professionalId, bookingId));
    }

    @GetMapping("/professionals/{professionalId}/jobs")
    public ResponseEntity<List<DailyHelpBookingResponse>> professionalJobs(@PathVariable String professionalId) {
        return ResponseEntity.ok(dailyHelpService.getProfessionalJobs(professionalId));
    }

    @GetMapping("/professionals/{professionalId}/earnings")
    public ResponseEntity<DailyHelpProfessionalEarningsResponse> earnings(@PathVariable String professionalId) {
        return ResponseEntity.ok(dailyHelpService.getProfessionalEarnings(professionalId));
    }

    @GetMapping("/bookings/latest")
    public ResponseEntity<DailyHelpBookingResponse> getLatestBooking(@RequestParam String buyerPhone) {
        return ResponseEntity.ok(dailyHelpService.getLatestBooking(buyerPhone));
    }

    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<DailyHelpBookingResponse> getBooking(@PathVariable String bookingId) {
        return ResponseEntity.ok(dailyHelpService.getBooking(bookingId));
    }

    @PostMapping("/bookings/{bookingId}/status")
    public ResponseEntity<DailyHelpBookingResponse> updateStatus(
            @PathVariable String bookingId,
            @Valid @RequestBody DailyHelpStatusRequest request) {
        return ResponseEntity.ok(dailyHelpService.updateStatus(bookingId, request.professionalId(), request.status()));
    }

    @PostMapping("/bookings/{bookingId}/start")
    public ResponseEntity<DailyHelpBookingResponse> startBooking(
            @PathVariable String bookingId,
            @Valid @RequestBody DailyHelpStartRequest request) {
        return ResponseEntity.ok(dailyHelpService.startBooking(bookingId, request));
    }

    @PostMapping("/bookings/{bookingId}/complete")
    public ResponseEntity<DailyHelpBookingResponse> completeBooking(
            @PathVariable String bookingId,
            @RequestParam String professionalId) {
        return ResponseEntity.ok(dailyHelpService.completeBooking(bookingId, professionalId));
    }
}

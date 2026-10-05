package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpStartRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpStatusRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpServiceResponse;
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

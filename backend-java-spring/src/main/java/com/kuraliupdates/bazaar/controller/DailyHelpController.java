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
import org.springframework.security.core.Authentication;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import org.springframework.http.HttpStatus;
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
            @Valid @RequestBody DailyHelpBookingRequest request, Authentication authentication) {
        UserEntity user = requireUser(authentication);
        if (!"BUYER".equalsIgnoreCase(user.getRole()) || !samePhone(user.getPhone(), request.buyerPhone())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only create a Daily Help booking for your own account");
        }
        return ResponseEntity.ok(dailyHelpService.createBooking(request));
    }

    @PostMapping("/professionals/register")
    public ResponseEntity<DailyHelpProfessionalResponse> registerProfessional(
            @Valid @RequestBody DailyHelpProfessionalRegistrationRequest request) {
        return ResponseEntity.ok(dailyHelpService.registerProfessional(request));
    }

    @GetMapping("/professionals/by-phone/{phone}")
    public ResponseEntity<DailyHelpProfessionalResponse> professionalByPhone(@PathVariable String phone, Authentication authentication) {
        UserEntity user = requireUser(authentication);
        if (!"PROFESSIONAL".equalsIgnoreCase(user.getRole()) || !samePhone(user.getPhone(), phone)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only access your own professional profile");
        }
        return ResponseEntity.ok(dailyHelpService.getProfessionalByPhone(user.getPhone()));
    }

    @PostMapping("/professionals/{professionalId}/availability")
    public ResponseEntity<DailyHelpProfessionalResponse> availability(
            @PathVariable String professionalId,
            @Valid @RequestBody DailyHelpProfessionalAvailabilityRequest request, Authentication authentication) {
        requireOwnProfessional(authentication, professionalId);
        return ResponseEntity.ok(dailyHelpService.updateProfessionalAvailability(professionalId, request));
    }

    @GetMapping("/professionals/{professionalId}/jobs/available")
    public ResponseEntity<List<DailyHelpBookingResponse>> availableJobs(@PathVariable String professionalId, Authentication authentication) {
        requireOwnProfessional(authentication, professionalId);
        return ResponseEntity.ok(dailyHelpService.getAvailableJobs(professionalId));
    }

    @PostMapping("/professionals/{professionalId}/jobs/{bookingId}/accept")
    public ResponseEntity<DailyHelpBookingResponse> acceptJob(
            @PathVariable String professionalId, @PathVariable String bookingId, Authentication authentication) {
        requireOwnProfessional(authentication, professionalId);
        return ResponseEntity.ok(dailyHelpService.acceptJob(professionalId, bookingId));
    }

    @GetMapping("/professionals/{professionalId}/jobs")
    public ResponseEntity<List<DailyHelpBookingResponse>> professionalJobs(@PathVariable String professionalId, Authentication authentication) {
        requireOwnProfessional(authentication, professionalId);
        return ResponseEntity.ok(dailyHelpService.getProfessionalJobs(professionalId));
    }

    @GetMapping("/professionals/{professionalId}/earnings")
    public ResponseEntity<DailyHelpProfessionalEarningsResponse> earnings(@PathVariable String professionalId, Authentication authentication) {
        requireOwnProfessional(authentication, professionalId);
        return ResponseEntity.ok(dailyHelpService.getProfessionalEarnings(professionalId));
    }

    @GetMapping("/bookings/latest")
    public ResponseEntity<DailyHelpBookingResponse> getLatestBooking(@RequestParam String buyerPhone, Authentication authentication) {
        UserEntity user = requireUser(authentication);
        if (!"BUYER".equalsIgnoreCase(user.getRole()) || !samePhone(user.getPhone(), buyerPhone)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only access your own Daily Help bookings");
        }
        return ResponseEntity.ok(dailyHelpService.getLatestBooking(user.getPhone()));
    }

    @GetMapping("/bookings/{bookingId}")
    public ResponseEntity<DailyHelpBookingResponse> getBooking(@PathVariable String bookingId, Authentication authentication) {
        UserEntity user = requireUser(authentication);
        return ResponseEntity.ok(dailyHelpService.getBookingForUser(bookingId, user));
    }

    @PostMapping("/bookings/{bookingId}/status")
    public ResponseEntity<DailyHelpBookingResponse> updateStatus(
            @PathVariable String bookingId,
            @Valid @RequestBody DailyHelpStatusRequest request, Authentication authentication) {
        requireOwnProfessional(authentication, request.professionalId());
        return ResponseEntity.ok(dailyHelpService.updateStatus(bookingId, request.professionalId(), request.status()));
    }

    @PostMapping("/bookings/{bookingId}/start")
    public ResponseEntity<DailyHelpBookingResponse> startBooking(
            @PathVariable String bookingId,
            @Valid @RequestBody DailyHelpStartRequest request, Authentication authentication) {
        requireOwnProfessional(authentication, request.professionalId());
        return ResponseEntity.ok(dailyHelpService.startBooking(bookingId, request));
    }

    @PostMapping("/bookings/{bookingId}/complete")
    public ResponseEntity<DailyHelpBookingResponse> completeBooking(
            @PathVariable String bookingId,
            @RequestParam String professionalId, Authentication authentication) {
        requireOwnProfessional(authentication, professionalId);
        return ResponseEntity.ok(dailyHelpService.completeBooking(bookingId, professionalId));
    }

    private UserEntity requireUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity user)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "An authenticated session is required");
        }
        return user;
    }

    private void requireOwnProfessional(Authentication authentication, String professionalId) {
        UserEntity user = requireUser(authentication);
        if (!"PROFESSIONAL".equalsIgnoreCase(user.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Professional account required");
        }
        DailyHelpProfessionalResponse profile = dailyHelpService.getProfessionalByPhone(user.getPhone());
        if (!profile.professionalId().equals(professionalId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only manage your own professional account");
        }
    }

    private boolean samePhone(String left, String right) {
        if (left == null || right == null) return false;
        String a = left.replaceAll("\\D", "");
        String b = right.replaceAll("\\D", "");
        return !a.isBlank() && a.equals(b);
    }
}

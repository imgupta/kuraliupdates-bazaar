package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalAvailabilityRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpSlotRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpStatusRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpStartRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalResponse;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.DailyHelpService;
import com.kuraliupdates.bazaar.service.E2eRunTagging;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class DailyHelpControllerTest {
    private DailyHelpService dailyHelpService;
    private E2eRunTagging e2eRunTagging;
    private DailyHelpController controller;

    @BeforeEach
    void setUp() {
        dailyHelpService = mock(DailyHelpService.class);
        e2eRunTagging = mock(E2eRunTagging.class);
        controller = new DailyHelpController(dailyHelpService, e2eRunTagging);
    }

    @Test
    void buyerPrimaryAccountCanAccessOnlyItsOwnProfessionalSlots() {
        UserEntity user = user("98765-00000", "BUYER");
        Authentication authentication = authentication(user);
        when(dailyHelpService.getProfessionalByPhone("98765-00000"))
                .thenReturn(profile("DHP-OWN", "9876500000"));
        when(dailyHelpService.getProfessionalSlots("DHP-OWN", LocalDate.now())).thenReturn(List.of());

        var response = controller.professionalSlots("DHP-OWN", LocalDate.now(), authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(dailyHelpService).getProfessionalSlots("DHP-OWN", LocalDate.now());
    }

    @Test
    void accountCannotAccessAnotherProfessionalsSlotsByChangingPathId() {
        UserEntity user = user("9876500000", "BUYER");
        Authentication authentication = authentication(user);
        when(dailyHelpService.getProfessionalByPhone("9876500000"))
                .thenReturn(profile("DHP-OWN", "9876500000"));

        ApiException error = assertThrows(ApiException.class,
                () -> controller.professionalSlots("DHP-OTHER", LocalDate.now(), authentication));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(dailyHelpService, never()).getProfessionalSlots(anyString(), any());
    }

    @Test
    void wrongProfessionalProfileIdCannotReadJobsOrEarnings() {
        Authentication authentication = authentication(user("9876500000", "BUYER"));
        when(dailyHelpService.getProfessionalByPhone("9876500000"))
                .thenReturn(profile("DHP-OWN", "9876500000"));

        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class,
                () -> controller.professionalJobs("DHP-OTHER", authentication)).getStatus());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class,
                () -> controller.earnings("DHP-OTHER", authentication)).getStatus());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class,
                () -> controller.availableJobs("DHP-OTHER", authentication)).getStatus());

        verify(dailyHelpService, never()).getProfessionalJobs(anyString());
        verify(dailyHelpService, never()).getProfessionalEarnings(anyString());
        verify(dailyHelpService, never()).getAvailableJobs(anyString());
    }

    @Test
    void wrongProfessionalProfileIdCannotAcceptOrCompleteJobs() {
        Authentication authentication = authentication(user("9876500000", "BUYER"));
        when(dailyHelpService.getProfessionalByPhone("9876500000"))
                .thenReturn(profile("DHP-OWN", "9876500000"));

        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class,
                () -> controller.acceptJob("DHP-OTHER", "BOOK-1", authentication)).getStatus());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class,
                () -> controller.completeBooking("BOOK-1", "DHP-OTHER", authentication)).getStatus());

        verify(dailyHelpService, never()).acceptJob(anyString(), anyString());
        verify(dailyHelpService, never()).completeBooking(anyString(), anyString());
    }

    @Test
    void wrongProfessionalProfileIdCannotCancelAnotherProfilesSlot() {
        Authentication authentication = authentication(user("9876500000", "BUYER"));
        when(dailyHelpService.getProfessionalByPhone("9876500000"))
                .thenReturn(profile("DHP-OWN", "9876500000"));

        ApiException error = assertThrows(ApiException.class,
                () -> controller.cancelProfessionalSlot("DHP-OTHER", "SLOT-OTHER", authentication));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verify(dailyHelpService, never()).cancelProfessionalSlot(anyString(), anyString());
    }

    @Test
    void wrongProfessionalProfileIdCannotUpdateAvailabilityOrCreateSlots() {
        Authentication authentication = authentication(user("9876500000", "BUYER"));
        when(dailyHelpService.getProfessionalByPhone("9876500000"))
                .thenReturn(profile("DHP-OWN", "9876500000"));

        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class,
                () -> controller.availability("DHP-OTHER",
                        new DailyHelpProfessionalAvailabilityRequest("AVAILABLE", "Kurali"),
                        authentication)).getStatus());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class,
                () -> controller.createProfessionalSlot("DHP-OTHER",
                        new DailyHelpSlotRequest(LocalDate.now().plusDays(1),
                                java.time.LocalTime.of(10, 0), java.time.LocalTime.of(11, 0)),
                        authentication)).getStatus());

        verify(dailyHelpService, never()).updateProfessionalAvailability(anyString(), any());
        verify(dailyHelpService, never()).createProfessionalSlot(anyString(), any());
    }

    @Test
    void wrongProfessionalProfileIdInBookingMutationBodyCannotChangeStatusOrStartService() {
        Authentication authentication = authentication(user("9876500000", "BUYER"));
        when(dailyHelpService.getProfessionalByPhone("9876500000"))
                .thenReturn(profile("DHP-OWN", "9876500000"));

        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class,
                () -> controller.updateStatus("BOOK-1",
                        new DailyHelpStatusRequest("DHP-OTHER", "ARRIVING"),
                        authentication)).getStatus());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ApiException.class,
                () -> controller.startBooking("BOOK-1",
                        new DailyHelpStartRequest("DHP-OTHER", "123456"),
                        authentication)).getStatus());

        verify(dailyHelpService, never()).updateStatus(anyString(), anyString(), anyString());
        verify(dailyHelpService, never()).startBooking(anyString(), any());
    }

    @Test
    void buyerCannotCreateBookingForAnotherPhone() {
        UserEntity user = user("9876500000", "BUYER");
        Authentication authentication = authentication(user);
        DailyHelpBookingRequest request = new DailyHelpBookingRequest(
                "DH-CLEAN", "Buyer", "9876511111", "House 1", "Kurali",
                LocalDateTime.now().plusDays(1), BigDecimal.ONE, "SLOT-1");

        ApiException error = assertThrows(ApiException.class,
                () -> controller.createBooking(request, null, null, authentication));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        verifyNoInteractions(dailyHelpService, e2eRunTagging);
    }


    @Test
    void protectedDailyHelpRoutesRejectMissingAndMalformedUserPrincipalsBeforeServiceAccess() {
        Authentication malformed = mock(Authentication.class);
        when(malformed.getPrincipal()).thenReturn("not-a-user-principal");
        DailyHelpBookingRequest booking = new DailyHelpBookingRequest(
                "DH-CLEAN", "Buyer", "9876500000", "House 1", "Kurali",
                LocalDateTime.now().plusDays(1), BigDecimal.ONE, "SLOT-1");

        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.createBooking(booking, null, null, null)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.createBooking(booking, null, null, malformed)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.professionalByPhone("9876500000", malformed)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.professionalSlots("DHP-1", LocalDate.now(), malformed)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.earnings("DHP-1", malformed)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.getLatestBooking("9876500000", malformed)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.getBooking("BOOK-1", malformed)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.updateStatus("BOOK-1",
                        new DailyHelpStatusRequest("DHP-1", "ARRIVING"), malformed)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.startBooking("BOOK-1",
                        new DailyHelpStartRequest("DHP-1", "123456"), malformed)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.completeBooking("BOOK-1", "DHP-1", malformed)).getStatus());

        verifyNoInteractions(dailyHelpService, e2eRunTagging);
    }

    @Test
    void missingAuthenticationCannotAccessDailyHelpProfessionalMutationRoutes() {
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.availability("DHP-1",
                        new DailyHelpProfessionalAvailabilityRequest("AVAILABLE", "Kurali"), null)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.createProfessionalSlot("DHP-1",
                        new DailyHelpSlotRequest(LocalDate.now().plusDays(1),
                                java.time.LocalTime.of(10, 0), java.time.LocalTime.of(11, 0)), null)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.cancelProfessionalSlot("DHP-1", "SLOT-1", null)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.availableJobs("DHP-1", null)).getStatus());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class,
                () -> controller.acceptJob("DHP-1", "BOOK-1", null)).getStatus());

        verifyNoInteractions(dailyHelpService);
    }

    private Authentication authentication(UserEntity user) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(user);
        when(authentication.getAuthorities()).thenReturn(List.of(
                new SimpleGrantedAuthority("ROLE_BUYER"),
                new SimpleGrantedAuthority("ROLE_PROFESSIONAL")));
        return authentication;
    }

    private UserEntity user(String phone, String role) {
        return UserEntity.builder().userId("USER-1").phone(phone).role(role).build();
    }

    private DailyHelpProfessionalResponse profile(String id, String phone) {
        return new DailyHelpProfessionalResponse(id, "USER-1", "Helper", phone, "0.00",
                0, "Kurali", "AVAILABLE", true, null, null);
    }
}

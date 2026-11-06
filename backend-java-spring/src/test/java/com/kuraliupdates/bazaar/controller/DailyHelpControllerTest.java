package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpBookingRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalResponse;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.DailyHelpService;
import com.kuraliupdates.bazaar.service.E2eRunTagging;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

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

    private Authentication authentication(UserEntity user) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn(user);
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

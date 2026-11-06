package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.address.AddressRequest;
import com.kuraliupdates.bazaar.dto.address.AddressResponse;
import com.kuraliupdates.bazaar.dto.auth.UserResponse;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.BuyerAddressService;
import com.kuraliupdates.bazaar.service.PortalHandoffService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerAddressTest {
    @Mock private AuthService authService;
    @Mock private BuyerAddressService addressService;
    @Mock private PortalHandoffService portalHandoffService;
    @InjectMocks private AuthController controller;

    @Test
    void addressListComesFromTheAuthenticatedSessionUser() {
        AddressResponse address = address("addr-owner", "Owner Road", 1);
        UserResponse user = mock(UserResponse.class);
        when(user.addresses()).thenReturn(List.of(address));
        when(authService.currentUser("owner-session")).thenReturn(user);

        ResponseEntity<List<AddressResponse>> response =
                controller.getAddresses("Bearer owner-session");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(List.of(address), response.getBody());
        verify(authService).currentUser("owner-session");
        verifyNoInteractions(addressService);
    }

    @Test
    void createAddressUsesTheUserResolvedFromTheAuthenticatedSession() {
        UserEntity owner = UserEntity.builder().userId("user-owner").name("Owner").build();
        AddressRequest request = request("New Home", false);
        AddressResponse saved = address("addr-new", "New Home Road", 1);
        when(authService.requireUser("owner-session")).thenReturn(owner);
        when(addressService.create("user-owner", request)).thenReturn(saved);

        ResponseEntity<AddressResponse> response =
                controller.createAddress("Bearer owner-session", request);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(saved, response.getBody());
        verify(addressService).create("user-owner", request);
        verify(addressService, never()).create(eq("user-attacker"), any());
    }

    @Test
    void updateAddressScopesTheAddressLookupToTheAuthenticatedUser() {
        UserEntity owner = UserEntity.builder().userId("user-owner").name("Owner").build();
        AddressRequest request = request("Updated Home", false);
        AddressResponse updated = address("addr-owner", "Updated Home Road", 1);
        when(authService.requireUser("owner-session")).thenReturn(owner);
        when(addressService.update("user-owner", "addr-owner", request)).thenReturn(Optional.of(updated));

        ResponseEntity<AddressResponse> response =
                controller.updateAddress("Bearer owner-session", "addr-owner", request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(updated, response.getBody());
        verify(addressService).update("user-owner", "addr-owner", request);
    }

    @Test
    void addressOwnedByAnotherAccountIsReturnedAsNotFoundWithoutCrossAccountWrite() {
        UserEntity requester = UserEntity.builder().userId("user-requester").name("Requester").build();
        AddressRequest request = request("Attempted takeover", false);
        when(authService.requireUser("requester-session")).thenReturn(requester);
        when(addressService.update("user-requester", "addr-owner", request)).thenReturn(Optional.empty());

        ResponseEntity<AddressResponse> response =
                controller.updateAddress("Bearer requester-session", "addr-owner", request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
        verify(addressService).update("user-requester", "addr-owner", request);
        verify(addressService, never()).update(eq("user-owner"), anyString(), any());
    }

    @Test
    void defaultAddressChangeUsesAuthenticatedUserAndRejectsForeignAddress() {
        UserEntity requester = UserEntity.builder().userId("user-requester").name("Requester").build();
        when(authService.requireUser("requester-session")).thenReturn(requester);
        when(addressService.setDefault("user-requester", "addr-owner")).thenReturn(Optional.empty());

        ResponseEntity<AddressResponse> response =
                controller.setDefaultAddress("Bearer requester-session", "addr-owner");

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(addressService).setDefault("user-requester", "addr-owner");
        verify(addressService, never()).setDefault("user-owner", "addr-owner");
    }

    @Test
    void missingOrExpiredSessionCannotCreateOrMutateAddresses() {
        when(authService.requireUser(null))
                .thenThrow(new ApiException(HttpStatus.UNAUTHORIZED, "No active token"));

        assertThrows(ApiException.class,
                () -> controller.createAddress(null, request("Home", true)));
        assertThrows(ApiException.class,
                () -> controller.updateAddress("Bearer ", "addr-owner", request("Home", true)));
        assertThrows(ApiException.class,
                () -> controller.setDefaultAddress(null, "addr-owner"));

        verifyNoInteractions(addressService);
    }

    private AddressRequest request(String line, boolean makeDefault) {
        return new AddressRequest("Home", line, null, "Kurali, Punjab", null,
                null, null, makeDefault);
    }

    private AddressResponse address(String id, String line, int isDefault) {
        LocalDateTime now = LocalDateTime.now();
        return new AddressResponse(id, "Home", line, null, "Kurali, Punjab", null,
                BigDecimal.valueOf(30.83), BigDecimal.valueOf(76.57), isDefault, now, now);
    }
}

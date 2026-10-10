package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.address.AddressResponse;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.entity.UserAddressEntity;
import com.kuraliupdates.bazaar.repository.UserAddressRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BuyerAddressServiceTest {
    @Mock private UserAddressRepository addressRepository;
    @Mock private UserRepository userRepository;
    @InjectMocks private BuyerAddressService addressService;

    @Test
    void normalizesLegacyPrimaryAddressWhenSavedAddressListIsEmpty() {
        UserEntity user = UserEntity.builder()
                .userId("user-1")
                .name("Buyer")
                .addressLine1("Flat 4, Main Bazaar")
                .landmark("Near Clock Tower")
                .formattedAddress("Kurali, Punjab")
                .placeId("place-1")
                .build();

        when(addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc("user-1"))
                .thenReturn(new ArrayList<>());
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(addressRepository.save(any(UserAddressEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        List<AddressResponse> addresses = addressService.findByUserId("user-1");

        assertEquals(1, addresses.size());
        assertEquals("Flat 4, Main Bazaar", addresses.get(0).addressLine1());
        assertEquals("Home", addresses.get(0).label());
        assertEquals(Integer.valueOf(1), addresses.get(0).isDefault());
        assertNotNull(addresses.get(0).addressId());
        verify(addressRepository).save(any(UserAddressEntity.class));
    }

    @Test
    void doesNotCreateLegacyAddressWhenUserHasNoPrimaryAddress() {
        UserEntity user = UserEntity.builder().userId("user-2").name("Buyer").build();
        when(addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc("user-2"))
                .thenReturn(new ArrayList<>());
        when(userRepository.findById("user-2")).thenReturn(Optional.of(user));

        List<AddressResponse> addresses = addressService.findByUserId("user-2");

        assertTrue(addresses.isEmpty());
        verify(addressRepository, never()).save(any(UserAddressEntity.class));
    }

    @Test
    void leavesExistingSavedAddressesUnchanged() {
        UserAddressEntity existing = UserAddressEntity.builder()
                .addressId("addr-existing")
                .userId("user-3")
                .label("Office")
                .addressLine1("Office address")
                .isDefault(1)
                .build();
        when(addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc("user-3"))
                .thenReturn(new ArrayList<>(List.of(existing)));

        List<AddressResponse> addresses = addressService.findByUserId("user-3");

        assertEquals(1, addresses.size());
        assertEquals("Office address", addresses.get(0).addressLine1());
        verify(userRepository, never()).findById(anyString());
        verify(addressRepository, never()).save(any(UserAddressEntity.class));
    }
}

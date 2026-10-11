package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.address.AddressRequest;
import com.kuraliupdates.bazaar.dto.address.AddressResponse;
import com.kuraliupdates.bazaar.entity.UserAddressEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
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
        UserEntity user = UserEntity.builder().userId("user-1").name("Buyer")
                .addressLine1("Flat 4, Main Bazaar").landmark("Near Clock Tower")
                .formattedAddress("Kurali, Punjab").placeId("place-1").build();
        when(addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc("user-1")).thenReturn(new ArrayList<>());
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(addressRepository.save(any(UserAddressEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
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
        when(addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc("user-2")).thenReturn(new ArrayList<>());
        when(userRepository.findById("user-2")).thenReturn(Optional.of(user));
        assertTrue(addressService.findByUserId("user-2").isEmpty());
        verify(addressRepository, never()).save(any(UserAddressEntity.class));
    }

    @Test
    void leavesExistingSavedAddressesUnchanged() {
        UserAddressEntity existing = UserAddressEntity.builder().addressId("addr-existing").userId("user-3")
                .label("Office").addressLine1("Office address").isDefault(1).build();
        when(addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc("user-3"))
                .thenReturn(new ArrayList<>(List.of(existing)));
        List<AddressResponse> addresses = addressService.findByUserId("user-3");
        assertEquals(1, addresses.size());
        assertEquals("Office address", addresses.get(0).addressLine1());
        verify(userRepository, never()).findById(anyString());
        verify(addressRepository, never()).save(any(UserAddressEntity.class));
    }

    @Test
    void returnsEverySavedAddressInStableRepositoryOrderWithoutRewritingRows() {
        UserAddressEntity home = UserAddressEntity.builder().addressId("addr-home").userId("user-4")
                .label("Home").addressLine1("Home Road").isDefault(1).build();
        UserAddressEntity office = UserAddressEntity.builder().addressId("addr-office").userId("user-4")
                .label("Office").addressLine1("Office Road").isDefault(0).build();
        when(addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc("user-4"))
                .thenReturn(new ArrayList<>(List.of(home, office)));
        List<AddressResponse> addresses = addressService.findByUserId("user-4");
        assertEquals(2, addresses.size());
        assertEquals(List.of("addr-home", "addr-office"), addresses.stream().map(AddressResponse::addressId).toList());
        verify(addressRepository, never()).save(any(UserAddressEntity.class));
        verify(userRepository, never()).findById(anyString());
    }

    @Test
    void addressCannotBeUpdatedByAUserWhoDoesNotOwnIt() {
        UserEntity user = UserEntity.builder().userId("owner-1").build();
        when(userRepository.findById("owner-1")).thenReturn(Optional.of(user));
        when(addressRepository.findByAddressIdAndUserId("addr-other", "owner-1")).thenReturn(Optional.empty());
        AddressRequest request = new AddressRequest("Home", "Changed address", null, null, null, null, null, false);
        assertTrue(addressService.update("owner-1", "addr-other", request).isEmpty());
        verify(addressRepository, never()).save(any(UserAddressEntity.class));
    }

    @Test
    void settingDefaultAddressClearsOldDefaultAndPersistsNewDefault() {
        UserEntity user = UserEntity.builder().userId("user-5").build();
        UserAddressEntity oldDefault = UserAddressEntity.builder().addressId("addr-old").userId("user-5")
                .addressLine1("Old").isDefault(1).build();
        UserAddressEntity nextDefault = UserAddressEntity.builder().addressId("addr-new").userId("user-5")
                .addressLine1("New").isDefault(0).build();
        when(userRepository.findById("user-5")).thenReturn(Optional.of(user));
        when(addressRepository.findByAddressIdAndUserId("addr-new", "user-5")).thenReturn(Optional.of(nextDefault));
        when(addressRepository.findByUserIdOrderByIsDefaultDescUpdatedAtDesc("user-5"))
                .thenReturn(new ArrayList<>(List.of(oldDefault, nextDefault)));
        when(addressRepository.save(any(UserAddressEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(addressRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = addressService.setDefault("user-5", "addr-new");

        assertTrue(response.isPresent());
        assertEquals(0, oldDefault.getIsDefault());
        assertEquals(1, nextDefault.getIsDefault());
        verify(addressRepository).saveAll(any());
        verify(addressRepository).save(nextDefault);
        verify(userRepository).save(user);
    }
}

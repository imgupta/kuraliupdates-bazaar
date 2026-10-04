package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.UserAddressEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserAddressRepository extends JpaRepository<UserAddressEntity, String> {
    List<UserAddressEntity> findByUserIdOrderByIsDefaultDescUpdatedAtDesc(String userId);
    Optional<UserAddressEntity> findByAddressIdAndUserId(String addressId, String userId);
}

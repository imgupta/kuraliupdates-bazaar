package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.DailyHelpBookingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DailyHelpBookingRepository extends JpaRepository<DailyHelpBookingEntity, String> {
    Optional<DailyHelpBookingEntity> findFirstByBuyerPhoneOrderByCreatedAtDesc(String buyerPhone);
}

package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.DailyHelpBookingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DailyHelpBookingRepository extends JpaRepository<DailyHelpBookingEntity, String> {
    Optional<DailyHelpBookingEntity> findFirstByBuyerPhoneOrderByCreatedAtDesc(String buyerPhone);

    java.util.List<DailyHelpBookingEntity> findByStatusAndLocalityIgnoreCaseAndProfessionalIsNullOrderByScheduledStartAsc(
            String status, String locality);

    java.util.List<DailyHelpBookingEntity> findByProfessionalProfessionalIdOrderByScheduledStartDesc(String professionalId);

    java.util.List<DailyHelpBookingEntity> findByProfessionalProfessionalIdAndStatusOrderByScheduledStartDesc(
            String professionalId, String status);
}

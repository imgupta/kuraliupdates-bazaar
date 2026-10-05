package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DailyHelpProfessionalRepository extends JpaRepository<DailyHelpProfessionalEntity, String> {
    Optional<DailyHelpProfessionalEntity> findFirstByStatusAndVerifiedAndCurrentLocalityIgnoreCaseOrderByRatingDesc(
            String status, Integer verified, String currentLocality);

    Optional<DailyHelpProfessionalEntity> findByPhone(String phone);
}

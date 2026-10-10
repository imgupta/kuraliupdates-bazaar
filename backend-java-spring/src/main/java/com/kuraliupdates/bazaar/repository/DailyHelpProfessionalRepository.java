package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface DailyHelpProfessionalRepository extends JpaRepository<DailyHelpProfessionalEntity, String> {
    Optional<DailyHelpProfessionalEntity> findFirstByStatusAndVerifiedAndCurrentLocalityIgnoreCaseOrderByRatingDesc(
            String status, Integer verified, String currentLocality);

    Optional<DailyHelpProfessionalEntity> findByPhone(String phone);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from DailyHelpProfessionalEntity p where p.professionalId = :professionalId")
    Optional<DailyHelpProfessionalEntity> findLockedByProfessionalId(@Param("professionalId") String professionalId);
}

package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.DailyHelpProfessionalSlotEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyHelpProfessionalSlotRepository extends JpaRepository<DailyHelpProfessionalSlotEntity, String> {
    List<DailyHelpProfessionalSlotEntity> findByProfessionalProfessionalIdAndSlotDateOrderByStartTimeAsc(
            String professionalId, LocalDate slotDate);

    @Query("""
        select s from DailyHelpProfessionalSlotEntity s
        join fetch s.professional p
        where s.slotDate = :slotDate
          and s.status = 'AVAILABLE'
          and (:locality is null or upper(trim(p.currentLocality)) = upper(trim(:locality)))
        order by s.startTime asc, p.rating desc
        """)
    List<DailyHelpProfessionalSlotEntity> findAvailableForDate(
            @Param("slotDate") LocalDate slotDate,
            @Param("locality") String locality);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from DailyHelpProfessionalSlotEntity s where s.slotId = :slotId")
    Optional<DailyHelpProfessionalSlotEntity> findLockedBySlotId(@Param("slotId") String slotId);
}
package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.AdminMfaFactorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AdminMfaFactorRepository extends JpaRepository<AdminMfaFactorEntity, String> {
    @Modifying(flushAutomatically = true)
    @Query("update AdminMfaFactorEntity factor set factor.lastTotpCounter = :counter " +
            "where factor.userId = :userId and (factor.lastTotpCounter is null or factor.lastTotpCounter < :counter)")
    int consumeTotpCounter(@Param("userId") String userId, @Param("counter") Long counter);
}

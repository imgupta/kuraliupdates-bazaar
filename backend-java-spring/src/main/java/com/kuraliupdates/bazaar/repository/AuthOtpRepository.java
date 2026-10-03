package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.AuthOtpEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface AuthOtpRepository extends JpaRepository<AuthOtpEntity, String> {

    @Query("SELECT o FROM AuthOtpEntity o WHERE o.identifier = :identifier AND o.otpType = :otpType AND o.isUsed = 0 AND o.expiresAt > :now ORDER BY o.createdAt DESC")
    Optional<AuthOtpEntity> findValidOtp(
            @Param("identifier") String identifier,
            @Param("otpType") String otpType,
            @Param("now") LocalDateTime now
    );
}

package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.AdminMfaRecoveryCodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AdminMfaRecoveryCodeRepository extends JpaRepository<AdminMfaRecoveryCodeEntity, String> {
    @Modifying
    @Query("delete from AdminMfaRecoveryCodeEntity code where code.userId = :userId")
    int deleteAllForUser(@Param("userId") String userId);

    @Modifying
    @Query("""
            update AdminMfaRecoveryCodeEntity code
               set code.usedAt = :usedAt
             where code.userId = :userId
               and code.codeHash = :codeHash
               and code.usedAt is null
            """)
    int consume(@Param("userId") String userId, @Param("codeHash") String codeHash,
                @Param("usedAt") LocalDateTime usedAt);
}

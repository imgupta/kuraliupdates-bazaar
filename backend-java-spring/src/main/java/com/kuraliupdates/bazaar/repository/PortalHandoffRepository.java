package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.PortalHandoffEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface PortalHandoffRepository extends JpaRepository<PortalHandoffEntity, String> {

    void deleteByExpiresAtBefore(LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update PortalHandoffEntity handoff
               set handoff.consumedAt = :consumedAt
             where handoff.codeHash = :codeHash
               and handoff.consumedAt is null
               and handoff.expiresAt > :consumedAt
            """)
    int consume(@Param("codeHash") String codeHash, @Param("consumedAt") LocalDateTime consumedAt);
}

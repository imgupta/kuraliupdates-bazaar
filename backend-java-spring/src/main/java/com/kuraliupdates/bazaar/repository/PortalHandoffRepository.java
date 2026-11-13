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

    /**
     * Deletes expired rows with one set-based SQL statement.
     *
     * A derived deleteBy... method loads entities and deletes them individually.
     * Concurrent requests can then both hold the same entity and the second
     * delete raises Hibernate StaleStateException when the first has removed it.
     * This bulk delete is idempotent under concurrent callers: a row deleted by
     * another transaction simply contributes zero affected rows.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            delete from PortalHandoffEntity handoff
             where handoff.expiresAt < :now
            """)
    int deleteExpiredBefore(@Param("now") LocalDateTime now);

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

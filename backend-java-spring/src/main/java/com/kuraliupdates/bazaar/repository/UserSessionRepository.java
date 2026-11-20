package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.UserSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSessionEntity, String> {

    Optional<UserSessionEntity> findBySessionToken(String sessionToken);

    void deleteBySessionToken(String sessionToken);

    void deleteByUserId(String userId);

    @Modifying(flushAutomatically = true)
    @Query(value = "UPDATE USER_SESSIONS SET EXPIRES_AT = LEAST(ABSOLUTE_EXPIRES_AT, :idleExpiry) " +
            "WHERE SESSION_TOKEN = :sessionHash AND EXPIRES_AT > :now AND ABSOLUTE_EXPIRES_AT > :now " +
            "AND EXPIRES_AT < :touchThreshold", nativeQuery = true)
    int touchSession(@Param("sessionHash") String sessionHash, @Param("now") LocalDateTime now,
                     @Param("idleExpiry") LocalDateTime idleExpiry,
                     @Param("touchThreshold") LocalDateTime touchThreshold);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE USER_SESSIONS SET SESSION_TOKEN = :newSessionHash, " +
            "EXPIRES_AT = LEAST(ABSOLUTE_EXPIRES_AT, :idleExpiry) " +
            "WHERE SESSION_TOKEN = :oldSessionHash AND EXPIRES_AT > :now AND ABSOLUTE_EXPIRES_AT > :now", nativeQuery = true)
    int rotateSessionToken(@Param("oldSessionHash") String oldSessionHash,
                           @Param("newSessionHash") String newSessionHash,
                           @Param("now") LocalDateTime now,
                           @Param("idleExpiry") LocalDateTime idleExpiry);
}

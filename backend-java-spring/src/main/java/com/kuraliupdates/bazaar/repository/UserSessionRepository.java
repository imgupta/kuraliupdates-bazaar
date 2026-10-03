package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.UserSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSessionEntity, String> {

    Optional<UserSessionEntity> findBySessionToken(String sessionToken);

    void deleteBySessionToken(String sessionToken);
}

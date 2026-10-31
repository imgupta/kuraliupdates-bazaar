package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryAgentRepository extends JpaRepository<DeliveryAgentEntity, String> {

    Optional<DeliveryAgentEntity> findByUserId(String userId);

    Optional<DeliveryAgentEntity> findByPhone(String phone);

    Optional<DeliveryAgentEntity> findByEmail(String email);

    Optional<DeliveryAgentEntity> findByEmailIgnoreCase(String email);

    List<DeliveryAgentEntity> findByStatus(String status);
}

package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, String> {

    Optional<UserEntity> findByEmail(String email);

    Optional<UserEntity> findByPhone(String phone);

    Optional<UserEntity> findByEmailOrPhone(String email, String phone);

    List<UserEntity> findByRoleIgnoreCaseOrderByCreatedAtDesc(String role);
}

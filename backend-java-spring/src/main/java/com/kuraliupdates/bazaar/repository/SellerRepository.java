package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.SellerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SellerRepository extends JpaRepository<SellerEntity, String> {

    List<SellerEntity> findByStatus(String status);

    Optional<SellerEntity> findByEmail(String email);

    Optional<SellerEntity> findByEmailIgnoreCase(String email);

    List<SellerEntity> findByLocalityContainingIgnoreCase(String locality);

    @Query("SELECT s FROM SellerEntity s WHERE s.status = 'APPROVED' ORDER BY s.rating DESC")
    List<SellerEntity> findTopRatedApprovedSellers();
}

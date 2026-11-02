package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.SellerServiceAreaConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SellerServiceAreaConfigRepository extends JpaRepository<SellerServiceAreaConfigEntity, String> {
}

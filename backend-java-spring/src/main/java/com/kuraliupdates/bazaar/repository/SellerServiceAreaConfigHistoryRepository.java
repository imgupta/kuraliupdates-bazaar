package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.SellerServiceAreaConfigHistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SellerServiceAreaConfigHistoryRepository extends JpaRepository<SellerServiceAreaConfigHistoryEntity, String> {
    List<SellerServiceAreaConfigHistoryEntity> findByConfigKeyOrderByConfigVersionDesc(String configKey);
}

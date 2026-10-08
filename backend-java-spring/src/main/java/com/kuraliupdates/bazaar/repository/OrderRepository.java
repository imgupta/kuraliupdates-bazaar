package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, String> {

    List<OrderEntity> findBySeller_SellerId(String sellerId);

    List<OrderEntity> findByStatusIgnoreCase(String status);

    List<OrderEntity> findByDeliveryAgent_AgentId(String agentId);

    List<OrderEntity> findByBuyerEmail(String buyerEmail);

    @Query("SELECT COUNT(o) FROM OrderEntity o WHERE o.seller.sellerId = :sellerId")
    long countBySellerId(@Param("sellerId") String sellerId);
}

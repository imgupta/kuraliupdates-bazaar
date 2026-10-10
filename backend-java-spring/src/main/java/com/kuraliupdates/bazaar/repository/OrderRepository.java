package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, String> {

    List<OrderEntity> findBySeller_SellerId(String sellerId);

    List<OrderEntity> findByStatus(String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from OrderEntity o where o.orderId = :orderId")
    Optional<OrderEntity> findLockedByOrderId(@Param("orderId") String orderId);

    List<OrderEntity> findByDeliveryAgent_AgentId(String agentId);

    List<OrderEntity> findByBuyerEmail(String buyerEmail);

    @Query("SELECT COUNT(o) FROM OrderEntity o WHERE o.seller.sellerId = :sellerId")
    long countBySellerId(@Param("sellerId") String sellerId);
}

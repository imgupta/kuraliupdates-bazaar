package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.BillDiscountEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BillDiscountRepository extends JpaRepository<BillDiscountEntity, String> {
    List<BillDiscountEntity> findBySeller_SellerIdOrderByMinBillAmountAsc(String sellerId);
}
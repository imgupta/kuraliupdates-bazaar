package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<ProductEntity, String> {

    List<ProductEntity> findBySeller_SellerId(String sellerId);

    List<ProductEntity> findByCategory(String category);

    // Find products across Kurali sellers for price and distance comparison
    @Query("SELECT p FROM ProductEntity p WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.category) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<ProductEntity> searchProductsAcrossSellers(@Param("query") String query);

    @Query("SELECT p FROM ProductEntity p WHERE p.seller.status = 'APPROVED' ORDER BY (p.sellerPrice * (1 - p.additionalDiscountPercent / 100)) ASC")
    List<ProductEntity> findAllApprovedSortedByLowestPrice();
}

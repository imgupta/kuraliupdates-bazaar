package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface ProductRepository extends JpaRepository<ProductEntity, String> {

    List<ProductEntity> findBySeller_SellerId(String sellerId);

    List<ProductEntity> findByCategory(String category);

    @Query("SELECT p.seller.sellerId AS sellerId, COUNT(p) AS productCount FROM ProductEntity p GROUP BY p.seller.sellerId")
    List<Map<String, Object>> countProductsBySeller();

    @Query("SELECT p.category AS category, COUNT(p) AS productCount FROM ProductEntity p GROUP BY p.category ORDER BY COUNT(p) DESC")
    List<Map<String, Object>> countProductsByCategory();

    // Fetch seller in the same query so product serialization does not issue an N+1
    // sequence of lazy seller lookups when the catalogue contains many products.
    @Query("""
        SELECT p FROM ProductEntity p
        JOIN FETCH p.seller s
        WHERE UPPER(s.status) = 'APPROVED'
          AND (LOWER(p.title) LIKE LOWER(CONCAT('%', :query, '%'))
               OR LOWER(p.category) LIKE LOWER(CONCAT('%', :query, '%')))
        ORDER BY COALESCE(p.effectivePrice, p.sellerPrice) ASC, p.title ASC
        """)
    List<ProductEntity> searchProductsAcrossSellers(@Param("query") String query);

    @Query("""
        SELECT p FROM ProductEntity p
        JOIN FETCH p.seller s
        WHERE UPPER(s.status) = 'APPROVED'
        ORDER BY COALESCE(p.effectivePrice, p.sellerPrice) ASC, p.title ASC
        """)
    List<ProductEntity> findAllApprovedSortedByLowestPrice();
}

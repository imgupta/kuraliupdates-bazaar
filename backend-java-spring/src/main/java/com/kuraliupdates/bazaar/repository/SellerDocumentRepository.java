package com.kuraliupdates.bazaar.repository;
import com.kuraliupdates.bazaar.entity.SellerDocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SellerDocumentRepository extends JpaRepository<SellerDocumentEntity,String> {
 List<SellerDocumentEntity> findBySellerIdOrderByUploadedAtDesc(String sellerId);
 Optional<SellerDocumentEntity> findByDocumentIdAndSellerId(String documentId,String sellerId);
}

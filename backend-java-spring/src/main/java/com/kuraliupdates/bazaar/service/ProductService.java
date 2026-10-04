package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.product.ProductResponse;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<ProductResponse> search(String query) {
        String normalized = query == null ? "" : query.trim();
        return (normalized.isEmpty()
                ? productRepository.findAllApprovedSortedByLowestPrice()
                : productRepository.searchProductsAcrossSellers(normalized))
                .stream()
                .filter(product -> product.getSeller() != null && "APPROVED".equalsIgnoreCase(product.getSeller().getStatus()))
                .map(ProductResponse::from)
                .toList();
    }
}

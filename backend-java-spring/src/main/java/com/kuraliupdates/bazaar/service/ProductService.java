package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.product.ProductResponse;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepository;

    private static final int DEFAULT_PAGE_SIZE = 100;
    private static final int MAX_PAGE_SIZE = 200;

    @Transactional(readOnly = true)
    public List<ProductResponse> search(String query) {
        return search(query, 0, DEFAULT_PAGE_SIZE);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> search(String query, int page, int requestedSize) {
        String normalized = query == null ? "" : query.trim();
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(requestedSize, MAX_PAGE_SIZE));
        Pageable pageable = PageRequest.of(safePage, safeSize);
        return (normalized.isEmpty()
                ? productRepository.findAllApprovedSortedByLowestPrice(pageable)
                : productRepository.searchProductsAcrossSellers(normalized, pageable))
                .stream()
                // Keep this guard as defense in depth if a repository implementation changes.
                .filter(product -> product.getSeller() != null
                        && "APPROVED".equalsIgnoreCase(product.getSeller().getStatus())
                        && !Boolean.FALSE.equals(product.getSeller().getStoreOpen()))
                .map(ProductResponse::from)
                .toList();
    }
}

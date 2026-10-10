package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.ProductEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {
    @Mock private ProductRepository productRepository;
    @InjectMocks private ProductService productService;

    @Test
    void emptySearchUsesApprovedPriceSortedQueryAndFiltersUnapprovedSellerProducts() {
        ProductEntity approved = product("P-1", "Approved Store", "APPROVED");
        ProductEntity pending = product("P-2", "Pending Store", "PENDING");
        when(productRepository.findAllApprovedSortedByLowestPrice()).thenReturn(List.of(approved, pending));

        var result = productService.search("  ");

        assertEquals(1, result.size());
        verify(productRepository).findAllApprovedSortedByLowestPrice();
        verify(productRepository, never()).searchProductsAcrossSellers(anyString());
    }

    @Test
    void nonEmptySearchTrimsQueryAndUsesCrossSellerSearch() {
        when(productRepository.searchProductsAcrossSellers("milk"))
                .thenReturn(List.of(product("P-3", "Approved Store", "APPROVED")));

        var result = productService.search(" milk ");

        assertEquals(1, result.size());
        verify(productRepository).searchProductsAcrossSellers("milk");
    }

    private ProductEntity product(String id, String store, String status) {
        SellerEntity seller = SellerEntity.builder()
                .sellerId("SELLER-" + id).storeName(store).status(status).build();
        return ProductEntity.builder()
                .productId(id).seller(seller).title("Milk").category("Dairy")
                .mrp(BigDecimal.valueOf(60)).sellerPrice(BigDecimal.valueOf(50))
                .additionalDiscountPercent(BigDecimal.ZERO).stock(5).unit("1 L")
                .build();
    }
}

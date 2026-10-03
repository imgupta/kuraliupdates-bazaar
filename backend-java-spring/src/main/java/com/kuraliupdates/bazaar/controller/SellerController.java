package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.ProductEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/sellers")
@RequiredArgsConstructor
@Tag(name = "Seller Microservice API", description = "Shopkeeper registration, Admin approval flow, inventory & pricing")
public class SellerController {

    private final SellerRepository sellerRepository;
    private final ProductRepository productRepository;

    @PostMapping("/register")
    @Operation(summary = "Register new Kurali Shop (Enters PENDING state for Admin Approval)")
    public ResponseEntity<SellerEntity> registerSeller(@RequestBody SellerEntity seller) {
        seller.setSellerId("seller-" + UUID.randomUUID().toString().substring(0, 8));
        seller.setStatus("PENDING"); // Requires Admin approval
        seller.setRegisteredAt(LocalDateTime.now());
        SellerEntity saved = sellerRepository.save(seller);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{sellerId}")
    @Operation(summary = "Get Seller details and status")
    public ResponseEntity<SellerEntity> getSeller(@PathVariable String sellerId) {
        return sellerRepository.findById(sellerId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{sellerId}/products")
    @Operation(summary = "Upload inventory with MRP, Seller Price, and Additional Discount %")
    public ResponseEntity<ProductEntity> addProduct(
            @PathVariable String sellerId,
            @RequestBody ProductEntity product) {
        return sellerRepository.findById(sellerId).map(seller -> {
            product.setProductId("prod-" + UUID.randomUUID().toString().substring(0, 8));
            product.setSeller(seller);
            product.setCreatedAt(LocalDateTime.now());
            ProductEntity saved = productRepository.save(product);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.badRequest().build());
    }

    @GetMapping("/{sellerId}/products")
    @Operation(summary = "Get all products for a specific Kurali store")
    public ResponseEntity<List<ProductEntity>> getSellerProducts(@PathVariable String sellerId) {
        return ResponseEntity.ok(productRepository.findBySeller_SellerId(sellerId));
    }
}

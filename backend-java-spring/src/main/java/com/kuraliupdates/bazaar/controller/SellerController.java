package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.product.ProductResponse;
import com.kuraliupdates.bazaar.dto.seller.SellerProductRequest;
import com.kuraliupdates.bazaar.dto.order.OrderResponse;
import com.kuraliupdates.bazaar.entity.ProductEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.SellerService;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
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
    private final SellerService sellerService;
    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register new Kurali Shop (legacy endpoint)")
    public ResponseEntity<SellerEntity> registerSeller(@RequestBody SellerEntity seller) {
        seller.setSellerId("seller-" + UUID.randomUUID().toString().substring(0, 8));
        seller.setStatus("PENDING");
        seller.setRegisteredAt(LocalDateTime.now());
        return ResponseEntity.ok(sellerRepository.save(seller));
    }

    @GetMapping("/me")
    @Operation(summary = "Get the authenticated seller store")
    public ResponseEntity<SellerEntity> getCurrentSeller(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        return ResponseEntity.ok(sellerService.getCurrentSeller(bearerToken(authorization)));
    }

    @GetMapping("/me/products")
    @Operation(summary = "Get products owned by the authenticated seller")
    public ResponseEntity<List<ProductResponse>> getMyProducts(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        return ResponseEntity.ok(sellerService.getProducts(bearerToken(authorization)));
    }

    @PostMapping("/me/products")
    @Operation(summary = "Add product for the authenticated approved seller")
    public ResponseEntity<ProductResponse> addMyProduct(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody SellerProductRequest request) {
        return ResponseEntity.ok(sellerService.addProduct(bearerToken(authorization), request));
    }

    @PutMapping("/me/products/{productId}")
    @Operation(summary = "Update product owned by the authenticated seller")
    public ResponseEntity<ProductResponse> updateMyProduct(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String productId,
            @Valid @RequestBody SellerProductRequest request) {
        return ResponseEntity.ok(sellerService.updateProduct(bearerToken(authorization), productId, request));
    }

    @DeleteMapping("/me/products/{productId}")
    @Operation(summary = "Delete product owned by the authenticated seller")
    public ResponseEntity<Void> deleteMyProduct(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String productId) {
        sellerService.deleteProduct(bearerToken(authorization), productId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me/orders")
    @Operation(summary = "Get orders for the authenticated seller")
    public ResponseEntity<List<OrderResponse>> getMyOrders(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        return ResponseEntity.ok(sellerService.getOrders(bearerToken(authorization)).stream().map(OrderResponse::from).toList());
    }

    @PostMapping("/me/orders/{orderId}/status")
    @Operation(summary = "Advance a seller order through its allowed lifecycle")
    public ResponseEntity<OrderResponse> updateMyOrderStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String orderId,
            @RequestParam String status) {
        return ResponseEntity.ok(OrderResponse.from(sellerService.updateOrderStatus(bearerToken(authorization), orderId, status)));
    }

    private String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) return null;
        return authorization.substring(7).trim();
    }
}
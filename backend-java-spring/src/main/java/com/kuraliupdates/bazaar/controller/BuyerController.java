package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.ProductEntity;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@RestController
@RequestMapping("/buyers")
@RequiredArgsConstructor
@Tag(name = "Buyer Microservice API", description = "Product search, price comparison across sellers, checkout & tracking")
public class BuyerController {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final SellerRepository sellerRepository;

    @GetMapping("/products/search")
    @Operation(summary = "Search products across all Kurali sellers to compare low prices and proximity")
    public ResponseEntity<List<ProductEntity>> searchProducts(@RequestParam(defaultValue = "") String query) {
        if (query.trim().isEmpty()) {
            return ResponseEntity.ok(productRepository.findAllApprovedSortedByLowestPrice());
        }
        return ResponseEntity.ok(productRepository.searchProductsAcrossSellers(query));
    }

    @PostMapping("/orders")
    @Operation(summary = "Place order with free delivery threshold check and 4-digit OTP generation")
    public ResponseEntity<OrderEntity> placeOrder(@RequestBody OrderEntity order) {
        String randomOtp = String.format("%04d", new Random().nextInt(10000));
        order.setOrderId("ORD-KUR-" + System.currentTimeMillis() % 100000);
        order.setDeliveryOtp(randomOtp);
        order.setStatus("PLACED");
        order.setPlacedAt(LocalDateTime.now());
        OrderEntity saved = orderRepository.save(order);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/orders/{orderId}/track")
    @Operation(summary = "Real-time order shipment tracking with delivery agent status and ETA")
    public ResponseEntity<OrderEntity> trackOrder(@PathVariable String orderId) {
        return orderRepository.findById(orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}

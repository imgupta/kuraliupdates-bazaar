package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.SellerEntity;
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
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "Admin Operations & Analytics Microservice", description = "Seller approval workflow, city analytics & demand insights")
public class AdminController {

    private final SellerRepository sellerRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    @GetMapping("/sellers/pending")
    @Operation(summary = "Get list of newly registered sellers waiting for Admin Approval")
    public ResponseEntity<List<SellerEntity>> getPendingSellers() {
        return ResponseEntity.ok(sellerRepository.findByStatus("PENDING"));
    }

    @PostMapping("/sellers/{sellerId}/approve")
    @Operation(summary = "Admin approves Kurali store to publish inventory & start selling")
    public ResponseEntity<SellerEntity> approveSeller(@PathVariable String sellerId) {
        return sellerRepository.findById(sellerId).map(seller -> {
            seller.setStatus("APPROVED");
            seller.setApprovedAt(LocalDateTime.now());
            return ResponseEntity.ok(sellerRepository.save(seller));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/sellers/{sellerId}/reject")
    @Operation(summary = "Admin rejects Kurali store registration")
    public ResponseEntity<SellerEntity> rejectSeller(@PathVariable String sellerId) {
        return sellerRepository.findById(sellerId).map(seller -> {
            seller.setStatus("REJECTED");
            return ResponseEntity.ok(sellerRepository.save(seller));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/analytics/demand-trends")
    @Operation(summary = "Get trending search queries and category revenue breakdown in Kurali")
    public ResponseEntity<Map<String, Object>> getDemandAnalytics() {
        return ResponseEntity.ok(Map.of(
                "totalStores", sellerRepository.count(),
                "totalOrders", orderRepository.count(),
                "topSearchQueries", List.of(
                        Map.of("query", "Pure Desi Ghee 1L", "growthRate", "+48%", "locality", "Railway Station Road"),
                        Map.of("query", "Fortune Basmati Rice 5kg", "growthRate", "+34%", "locality", "Main Bazaar"),
                        Map.of("query", "boAt ANC Earbuds", "growthRate", "+54%", "locality", "Chandigarh Road"),
                        Map.of("query", "Desi Mustard Oil", "growthRate", "+62%", "locality", "Siswan Road")
                ),
                "categoryShares", List.of(
                        Map.of("category", "Groceries & Daily Essentials", "percentage", 36),
                        Map.of("category", "Dairy, Bakery & Sweets", "percentage", 26),
                        Map.of("category", "Fruits & Vegetables", "percentage", 18),
                        Map.of("category", "Electronics & Mobiles", "percentage", 12),
                        Map.of("category", "Organic & Farm Produce", "percentage", 8)
                )
        ));
    }
}

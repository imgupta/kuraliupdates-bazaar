package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.admin.AdminBuyerResponse;
import com.kuraliupdates.bazaar.dto.admin.AdminAnalyticsResponse;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import java.math.BigDecimal;
import java.util.HashMap;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.UserRepository;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.SearchTrendRepository;
import com.kuraliupdates.bazaar.dto.admin.AdminSearchTrendResponse;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpServiceAdminRequest;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpServiceAdminResponse;
import com.kuraliupdates.bazaar.service.DailyHelpService;
import com.kuraliupdates.bazaar.repository.DailyHelpProfessionalRepository;
import com.kuraliupdates.bazaar.dto.dailyhelp.DailyHelpProfessionalResponse;
import org.springframework.data.domain.PageRequest;
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
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final UserRepository userRepository;
    private final SearchTrendRepository searchTrendRepository;
    private final DailyHelpService dailyHelpService;
    private final DailyHelpProfessionalRepository dailyHelpProfessionalRepository;

    @GetMapping("/buyers")
    @Operation(summary = "Get registered buyer accounts for the root admin")
    public ResponseEntity<List<AdminBuyerResponse>> getBuyers() {
        List<AdminBuyerResponse> buyers = userRepository.findByRoleIgnoreCaseOrderByCreatedAtDesc("BUYER")
                .stream()
                .map(user -> new AdminBuyerResponse(
                        user.getUserId(),
                        user.getName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getLocality(),
                        user.getAddress(),
                        user.getFormattedAddress(),
                        user.getIsVerified(),
                        user.getCreatedAt(),
                        user.getLastLogin()))
                .toList();
        return ResponseEntity.ok(buyers);
    }

    @GetMapping("/sellers")
    @Operation(summary = "Get all seller accounts from the database")
    public ResponseEntity<List<SellerEntity>> getAllSellers() {
        return ResponseEntity.ok(sellerRepository.findAll());
    }

    @GetMapping("/delivery")
    @Operation(summary = "Get all delivery partners from the database")
    public ResponseEntity<List<DeliveryAgentEntity>> getAllDeliveryAgents() {
        return ResponseEntity.ok(deliveryAgentRepository.findAll());
    }

    @GetMapping("/analytics/demand-trends")
    @Operation(summary = "Get admin analytics derived from current database records")
    public ResponseEntity<AdminAnalyticsResponse> getDemandAnalytics() {
        List<SellerEntity> sellers = sellerRepository.findAll();
        List<OrderEntity> orders = orderRepository.findAll();
        Map<String, Long> productCounts = new HashMap<>();
        productRepository.findAll().forEach(p -> productCounts.merge(p.getCategory(), 1L, Long::sum));

        Map<String, Long> orderCounts = new HashMap<>();
        Map<String, BigDecimal> revenue = new HashMap<>();
        Map<String, Long> localitySellers = new HashMap<>();
        Map<String, Long> localityProducts = new HashMap<>();
        Map<String, Long> localityOrders = new HashMap<>();

        sellers.forEach(s -> localitySellers.merge(s.getLocality(), 1L, Long::sum));
        productRepository.findAll().forEach(p -> localityProducts.merge(p.getSeller().getLocality(), 1L, Long::sum));
        BigDecimal totalGmv = BigDecimal.ZERO;
        for (OrderEntity order : orders) {
            String category = order.getSeller().getCategory();
            orderCounts.merge(category, 1L, Long::sum);
            BigDecimal amount = order.getTotalAmount() == null ? BigDecimal.ZERO : order.getTotalAmount();
            revenue.merge(category, amount, BigDecimal::add);
            totalGmv = totalGmv.add(amount);
            localityOrders.merge(order.getDeliveryLocality(), 1L, Long::sum);
        }

        List<AdminAnalyticsResponse.CategoryMetric> categories = productCounts.entrySet().stream()
                .map(e -> new AdminAnalyticsResponse.CategoryMetric(e.getKey(), e.getValue(),
                        orderCounts.getOrDefault(e.getKey(), 0L), revenue.getOrDefault(e.getKey(), BigDecimal.ZERO)))
                .sorted((a, b) -> Long.compare(b.productCount(), a.productCount()))
                .toList();
        List<AdminAnalyticsResponse.LocalityMetric> localities = localitySellers.keySet().stream()
                .map(l -> new AdminAnalyticsResponse.LocalityMetric(l, localitySellers.getOrDefault(l, 0L),
                        localityProducts.getOrDefault(l, 0L), localityOrders.getOrDefault(l, 0L)))
                .sorted((a, b) -> Long.compare(b.productCount(), a.productCount()))
                .toList();

        return ResponseEntity.ok(new AdminAnalyticsResponse(
                sellers.size(),
                sellers.stream().filter(s -> "APPROVED".equalsIgnoreCase(s.getStatus())).count(),
                productRepository.count(),
                orders.size(),
                totalGmv,
                userRepository.findByRoleIgnoreCaseOrderByCreatedAtDesc("BUYER").size(),
                deliveryAgentRepository.findByStatus("ACTIVE").size(),
                categories,
                localities));
    }

    @GetMapping("/analytics/search-trends")
    @Operation(summary = "Get top database-backed buyer search trends")
    public ResponseEntity<List<AdminSearchTrendResponse>> getSearchTrends() {
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        List<AdminSearchTrendResponse> trends = searchTrendRepository.findTopSearchesSince(since, PageRequest.of(0, 20))
                .stream()
                .map(metric -> new AdminSearchTrendResponse(metric.getQuery(), metric.getSearchCount()))
                .toList();
        return ResponseEntity.ok(trends);
    }

    @GetMapping("/sellers/pending")
    @Operation(summary = "Get list of newly registered sellers waiting for Admin Approval")
    public ResponseEntity<List<SellerEntity>> getPendingSellers() {
        return ResponseEntity.ok(sellerRepository.findByStatusNormalized("PENDING"));
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

    @GetMapping("/delivery/pending")
    @Operation(summary = "Get delivery partners waiting for Admin Approval")
    public ResponseEntity<List<DeliveryAgentEntity>> getPendingDeliveryAgents() {
        return ResponseEntity.ok(deliveryAgentRepository.findByStatus("PENDING"));
    }

    @PostMapping("/delivery/{agentId}/approve")
    @Operation(summary = "Admin approves Kurali Express delivery partner")
    public ResponseEntity<DeliveryAgentEntity> approveDeliveryAgent(@PathVariable String agentId) {
        return deliveryAgentRepository.findById(agentId).map(agent -> {
            agent.setStatus("ACTIVE");
            return ResponseEntity.ok(deliveryAgentRepository.save(agent));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/delivery/{agentId}/reject")
    @Operation(summary = "Admin rejects Kurali Express delivery partner")
    public ResponseEntity<DeliveryAgentEntity> rejectDeliveryAgent(@PathVariable String agentId) {
        return deliveryAgentRepository.findById(agentId).map(agent -> {
            agent.setStatus("REJECTED");
            return ResponseEntity.ok(deliveryAgentRepository.save(agent));
        }).orElse(ResponseEntity.notFound().build());
    }


    @GetMapping("/daily-help/helpers")
    @Operation(summary = "Get all Daily Help professionals/helpers for admin")
    public ResponseEntity<List<DailyHelpProfessionalResponse>> getDailyHelpHelpers() {
        return ResponseEntity.ok(dailyHelpProfessionalRepository.findAll().stream()
                .map(DailyHelpProfessionalResponse::from)
                .toList());
    }


    @GetMapping("/daily-help/services")
    @Operation(summary = "Get all Daily Help services for admin management")
    public ResponseEntity<List<DailyHelpServiceAdminResponse>> getDailyHelpServices() {
        return ResponseEntity.ok(dailyHelpService.getAllServicesForAdmin());
    }

    @PostMapping("/daily-help/services")
    @Operation(summary = "Create a Daily Help service")
    public ResponseEntity<DailyHelpServiceAdminResponse> createDailyHelpService(
            @jakarta.validation.Valid @RequestBody DailyHelpServiceAdminRequest request) {
        return ResponseEntity.ok(dailyHelpService.createService(request));
    }

    @PutMapping("/daily-help/services/{serviceId}")
    @Operation(summary = "Update a Daily Help service and its hourly rate")
    public ResponseEntity<DailyHelpServiceAdminResponse> updateDailyHelpService(
            @PathVariable String serviceId,
            @jakarta.validation.Valid @RequestBody DailyHelpServiceAdminRequest request) {
        return ResponseEntity.ok(dailyHelpService.updateService(serviceId, request));
    }


}

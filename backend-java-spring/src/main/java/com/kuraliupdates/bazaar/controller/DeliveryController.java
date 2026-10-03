package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/delivery")
@RequiredArgsConstructor
@Tag(name = "Delivery Fleet Microservice API", description = "Driver registration, price-based job board, OTP verification")
public class DeliveryController {

    private final DeliveryAgentRepository deliveryAgentRepository;
    private final OrderRepository orderRepository;

    @PostMapping("/register")
    @Operation(summary = "Register new delivery rider with vehicle details and license")
    public ResponseEntity<DeliveryAgentEntity> registerAgent(@RequestBody DeliveryAgentEntity agent) {
        agent.setAgentId("agent-" + UUID.randomUUID().toString().substring(0, 8));
        agent.setStatus("ACTIVE");
        agent.setRating(BigDecimal.valueOf(5.0));
        agent.setTotalTrips(0);
        agent.setTodayEarnings(BigDecimal.ZERO);
        agent.setTotalEarnings(BigDecimal.ZERO);
        agent.setRegisteredAt(LocalDateTime.now());
        DeliveryAgentEntity saved = deliveryAgentRepository.save(agent);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/jobs/available")
    @Operation(summary = "Get all orders ready for pickup with calculated distance and payout fee")
    public ResponseEntity<List<OrderEntity>> getAvailableJobs() {
        return ResponseEntity.ok(orderRepository.findByStatus("READY_FOR_PICKUP"));
    }

    @PostMapping("/jobs/{orderId}/claim")
    @Operation(summary = "Delivery rider accepts job based on payout and distance")
    public ResponseEntity<OrderEntity> claimJob(
            @PathVariable String orderId,
            @RequestParam String agentId) {
        return orderRepository.findById(orderId).flatMap(order ->
                deliveryAgentRepository.findById(agentId).map(agent -> {
                    order.setDeliveryAgent(agent);
                    order.setStatus("ASSIGNED_TO_DELIVERY");
                    return ResponseEntity.ok(orderRepository.save(order));
                })
        ).orElse(ResponseEntity.badRequest().build());
    }

    @PostMapping("/jobs/{orderId}/verify-otp")
    @Operation(summary = "Verify customer 4-digit OTP to complete delivery and credit earnings")
    public ResponseEntity<?> verifyDeliveryOtp(
            @PathVariable String orderId,
            @RequestBody Map<String, String> payload) {
        String enteredOtp = payload.get("otp");
        return orderRepository.findById(orderId).map(order -> {
            if (!order.getDeliveryOtp().equals(enteredOtp.trim())) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid Delivery OTP"));
            }
            order.setStatus("DELIVERED");
            order.setPaymentStatus("PAID");
            orderRepository.save(order);

            // Update Agent earnings
            if (order.getDeliveryAgent() != null) {
                DeliveryAgentEntity agent = order.getDeliveryAgent();
                BigDecimal payout = BigDecimal.valueOf(Math.max(45, Math.round(order.getDistanceKm().doubleValue() * 22) + 20));
                agent.setTotalTrips(agent.getTotalTrips() + 1);
                agent.setTodayEarnings(agent.getTodayEarnings().add(payout));
                agent.setTotalEarnings(agent.getTotalEarnings().add(payout));
                deliveryAgentRepository.save(agent);
            }

            return ResponseEntity.ok(Map.of("success", true, "message", "Order delivered and payout credited!"));
        }).orElse(ResponseEntity.notFound().build());
    }
}

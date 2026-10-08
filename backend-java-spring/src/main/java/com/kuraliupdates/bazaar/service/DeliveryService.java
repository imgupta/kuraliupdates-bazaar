package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.DeliveryAgentRepository;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeliveryService {
    private static final Set<String> VEHICLE_TYPES = Set.of("Bike", "Scooter", "Electric Bike", "Auto / Van");

    private final DeliveryAgentRepository agentRepository;
    private final OrderRepository orderRepository;

    @Transactional
    public DeliveryAgentEntity register(DeliveryAgentEntity request) {
        if (request.getPhone() == null || request.getEmail() == null || request.getFullName() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Name, phone and email are required");
        }
        if (!VEHICLE_TYPES.contains(request.getVehicleType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported vehicle type");
        }
        if (agentRepository.findByPhone(request.getPhone()).isPresent()
                || agentRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "A delivery partner already exists with this phone or email");
        }

        LocalDateTime now = LocalDateTime.now();
        request.setAgentId("agent-" + UUID.randomUUID().toString().substring(0, 8));
        request.setStatus("PENDING");
        request.setRating(BigDecimal.ZERO);
        request.setTotalTrips(0);
        request.setTodayEarnings(BigDecimal.ZERO);
        request.setTotalEarnings(BigDecimal.ZERO);
        request.setRegisteredAt(now);
        return agentRepository.save(request);
    }

    @Transactional(readOnly = true)
    public DeliveryAgentEntity currentAgent(com.kuraliupdates.bazaar.entity.UserEntity user) {
        return findAgentForUser(user);
    }

    @Transactional(readOnly = true)
    public List<OrderEntity> availableJobs(com.kuraliupdates.bazaar.entity.UserEntity user) {
        DeliveryAgentEntity agent = findAgentForUser(user);
        requireActive(agent);
        return orderRepository.findByStatus("READY_FOR_PICKUP");
    }

    @Transactional
    public OrderEntity claim(String orderId, String agentId, com.kuraliupdates.bazaar.entity.UserEntity user) {
        DeliveryAgentEntity authenticatedAgent = findAgentForUser(user);
        requireActive(authenticatedAgent);
        if (!authenticatedAgent.getAgentId().equals(agentId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only claim orders for your own delivery profile");
        }

        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        if (!"READY_FOR_PICKUP".equals(order.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Order is not available for pickup");
        }

        order.setDeliveryAgent(authenticatedAgent);
        order.setStatus("ASSIGNED_TO_DELIVERY");
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    @Transactional
    public Map<String, Object> verifyDeliveryOtp(String orderId, String enteredOtp, com.kuraliupdates.bazaar.entity.UserEntity user) {
        DeliveryAgentEntity authenticatedAgent = findAgentForUser(user);
        requireActive(authenticatedAgent);
        if (enteredOtp == null || !enteredOtp.matches("\\d{4}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Delivery OTP must be 4 digits");
        }

        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        if ("DELIVERED".equals(order.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Order has already been delivered");
        }
        if (!enteredOtp.equals(order.getDeliveryOtp())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid Delivery OTP");
        }

        DeliveryAgentEntity agent = order.getDeliveryAgent();
        if (agent == null || !agent.getAgentId().equals(authenticatedAgent.getAgentId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This order is not assigned to your delivery profile");
        }

        order.setStatus("DELIVERED");
        order.setPaymentStatus("COD".equalsIgnoreCase(order.getPaymentMethod()) ? "PAID" : order.getPaymentStatus());
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        if (agent != null) {
            BigDecimal distance = order.getDistanceKm() == null ? BigDecimal.ONE : order.getDistanceKm();
            BigDecimal payout = BigDecimal.valueOf(Math.max(45, Math.round(distance.doubleValue() * 22) + 20));
            agent.setTotalTrips(agent.getTotalTrips() + 1);
            agent.setTodayEarnings(agent.getTodayEarnings().add(payout));
            agent.setTotalEarnings(agent.getTotalEarnings().add(payout));
            agentRepository.save(agent);
        }

        return Map.of("success", true, "message", "Order delivered and payout credited!");
    }

    private DeliveryAgentEntity findAgentForUser(com.kuraliupdates.bazaar.entity.UserEntity user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authenticated user is required");
        }
        Optional<DeliveryAgentEntity> agent = user.getEmail() == null
                ? Optional.empty()
                : agentRepository.findByEmail(user.getEmail().trim().toLowerCase());
        if (agent.isEmpty() && user.getPhone() != null) {
            agent = agentRepository.findByPhone(user.getPhone().trim().replaceAll("\\D", ""));
        }
        return agent.orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "No delivery profile is linked to this account"));
    }

    private void requireActive(DeliveryAgentEntity agent) {
        if (!"ACTIVE".equalsIgnoreCase(agent.getStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Delivery partner approval is required before accessing pickup jobs");
        }
    }
}

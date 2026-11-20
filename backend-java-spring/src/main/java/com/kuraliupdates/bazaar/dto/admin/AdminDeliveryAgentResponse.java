package com.kuraliupdates.bazaar.dto.admin;

import com.kuraliupdates.bazaar.entity.DeliveryAgentEntity;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Explicit admin-facing delivery partner contract. */
public record AdminDeliveryAgentResponse(
        String agentId, String userId, String fullName, String phone, String email, String avatarUrl,
        String vehicleType, String vehicleNumber, String licenseNumber, String status,
        Boolean availableForJobs, BigDecimal rating, Integer totalTrips, BigDecimal todayEarnings,
        BigDecimal totalEarnings, String currentLocality, String wardNumber, BigDecimal currentLatitude,
        BigDecimal currentLongitude, LocalDateTime locationUpdatedAt, LocalDateTime registeredAt) {

    public static AdminDeliveryAgentResponse from(DeliveryAgentEntity agent) {
        return new AdminDeliveryAgentResponse(
                agent.getAgentId(), agent.getUserId(), agent.getFullName(), agent.getPhone(), agent.getEmail(),
                agent.getAvatarUrl(), agent.getVehicleType(), agent.getVehicleNumber(), agent.getLicenseNumber(),
                agent.getStatus(), agent.getAvailableForJobs(), agent.getRating(), agent.getTotalTrips(),
                agent.getTodayEarnings(), agent.getTotalEarnings(), agent.getCurrentLocality(), agent.getWardNumber(),
                agent.getCurrentLatitude(), agent.getCurrentLongitude(), agent.getLocationUpdatedAt(),
                agent.getRegisteredAt());
    }
}

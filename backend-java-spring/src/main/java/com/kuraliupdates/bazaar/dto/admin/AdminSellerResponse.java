package com.kuraliupdates.bazaar.dto.admin;

import com.kuraliupdates.bazaar.entity.SellerEntity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Explicit admin-facing seller contract; excludes internal proxy IP and E2E run metadata. */
public record AdminSellerResponse(
        String sellerId, String userId, String storeName, String ownerName, String email, String phone,
        String avatarUrl, String category, String address, String locality, BigDecimal distanceKm,
        BigDecimal latitude, BigDecimal longitude, Boolean locationVerified, BigDecimal rating,
        Integer reviewCount, String status, Boolean storeOpen, String gstNumber, String fssaiNumber,
        BigDecimal minOrderForFreeDelivery, BigDecimal baseDeliveryFee, String description,
        LocalDateTime registeredAt, LocalDateTime approvedAt, String businessType,
        String registeredBusinessName, String shopNumber, String wardNumber, String streetLocality,
        String pinCode, String landmark, String gstVerificationStatus, String fssaiVerificationStatus,
        String fssaiLicenseType, LocalDate fssaiExpiryDate, String openingTime, String closingTime,
        String weeklyClosedDay, Integer preparationMinutes, String agreementVersion,
        LocalDateTime agreementAcceptedAt) {

    public static AdminSellerResponse from(SellerEntity seller) {
        return new AdminSellerResponse(
                seller.getSellerId(), seller.getUserId(), seller.getStoreName(), seller.getOwnerName(),
                seller.getEmail(), seller.getPhone(), seller.getAvatarUrl(), seller.getCategory(),
                seller.getAddress(), seller.getLocality(), seller.getDistanceKm(), seller.getLatitude(),
                seller.getLongitude(), seller.getLocationVerified(), seller.getRating(), seller.getReviewCount(),
                seller.getStatus(), seller.getStoreOpen(), seller.getGstNumber(), seller.getFssaiNumber(),
                seller.getMinOrderForFreeDelivery(), seller.getBaseDeliveryFee(), seller.getDescription(),
                seller.getRegisteredAt(), seller.getApprovedAt(), seller.getBusinessType(),
                seller.getRegisteredBusinessName(), seller.getShopNumber(), seller.getWardNumber(),
                seller.getStreetLocality(), seller.getPinCode(), seller.getLandmark(),
                seller.getGstVerificationStatus(), seller.getFssaiVerificationStatus(),
                seller.getFssaiLicenseType(), seller.getFssaiExpiryDate(), seller.getOpeningTime(),
                seller.getClosingTime(), seller.getWeeklyClosedDay(), seller.getPreparationMinutes(),
                seller.getAgreementVersion(), seller.getAgreementAcceptedAt());
    }
}

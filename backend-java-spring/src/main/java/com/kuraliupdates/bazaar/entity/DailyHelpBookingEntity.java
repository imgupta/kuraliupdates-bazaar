package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "DAILY_HELP_BOOKINGS")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DailyHelpBookingEntity {
    @Id @Column(name = "BOOKING_ID", length = 64) private String bookingId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "SERVICE_ID", nullable = false) private DailyHelpServiceEntity service;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "PROFESSIONAL_ID") private DailyHelpProfessionalEntity professional;
    @Column(name = "BUYER_NAME", nullable = false, length = 150) private String buyerName;
    @Column(name = "BUYER_PHONE", nullable = false, length = 30) private String buyerPhone;
    @Column(name = "ADDRESS", nullable = false, length = 1000) private String address;
    @Column(name = "LOCALITY", nullable = false, length = 150) private String locality;
    @Column(name = "SCHEDULED_START", nullable = false) private LocalDateTime scheduledStart;
    @Column(name = "REQUESTED_HOURS", nullable = false, precision = 4, scale = 1) private BigDecimal requestedHours;
    @Column(name = "HOURLY_RATE", nullable = false, precision = 10, scale = 2) private BigDecimal hourlyRate;
    @Column(name = "ESTIMATED_TOTAL", nullable = false, precision = 10, scale = 2) private BigDecimal estimatedTotal;
    @Column(name = "STATUS", nullable = false, length = 40) private String status;
    @Column(name = "START_OTP", length = 10) private String startOtp;
    @Column(name = "OTP_EXPIRES_AT") private LocalDateTime otpExpiresAt;
    @Column(name = "OTP_ATTEMPTS", nullable = false) private Integer otpAttempts;
    @Column(name = "OTP_VERIFIED_AT") private LocalDateTime otpVerifiedAt;
    @Column(name = "SERVICE_STARTED_AT") private LocalDateTime serviceStartedAt;
    @Column(name = "SERVICE_COMPLETED_AT") private LocalDateTime serviceCompletedAt;
    @Column(name = "CREATED_AT", nullable = false) private LocalDateTime createdAt;
    @Column(name = "UPDATED_AT", nullable = false) private LocalDateTime updatedAt;
}

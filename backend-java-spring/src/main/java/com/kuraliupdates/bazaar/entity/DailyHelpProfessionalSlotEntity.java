package com.kuraliupdates.bazaar.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "DAILY_HELP_PROFESSIONAL_SLOTS",
       uniqueConstraints = @UniqueConstraint(name = "UK_DH_PROF_SLOT", columnNames = {"PROFESSIONAL_ID", "SLOT_DATE", "START_TIME", "END_TIME"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DailyHelpProfessionalSlotEntity {
    @Id @Column(name = "SLOT_ID", length = 64) private String slotId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "PROFESSIONAL_ID", nullable = false)
    private DailyHelpProfessionalEntity professional;

    @Column(name = "SLOT_DATE", nullable = false) private LocalDate slotDate;
    @Column(name = "START_TIME", nullable = false) private LocalTime startTime;
    @Column(name = "END_TIME", nullable = false) private LocalTime endTime;
    @Column(name = "STATUS", nullable = false, length = 20) private String status;
    @Column(name = "BOOKING_ID", length = 64) private String bookingId;
    @Column(name = "CREATED_AT", nullable = false) private LocalDateTime createdAt;
    @Column(name = "UPDATED_AT", nullable = false) private LocalDateTime updatedAt;
}
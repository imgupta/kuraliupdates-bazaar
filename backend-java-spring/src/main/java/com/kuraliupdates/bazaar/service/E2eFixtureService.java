package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.*;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Creates only run-owned synthetic catalogue and Daily Help fixtures.
 * It never creates accounts or silently approves/promotes a role profile.
 */
@Service
@RequiredArgsConstructor
public class E2eFixtureService {
    private static final Pattern STAGING_PROFILE_ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9_-]{0,127}");
    private static final BigDecimal TEST_PRICE = new BigDecimal("20.00");

    private final SellerRepository sellerRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final DailyHelpProfessionalRepository professionalRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final DailyHelpServiceRepository serviceRepository;
    private final DailyHelpProfessionalSlotRepository slotRepository;

    @Transactional
    public FixtureResult prepare(String runId, PrepareRequest request) {
        String sellerId = stagingProfileId(request.sellerId(), "sellerId");
        String agentId = stagingProfileId(request.deliveryAgentId(), "deliveryAgentId");
        String professionalId = request.professionalId() == null || request.professionalId().isBlank()
                ? null : stagingProfileId(request.professionalId(), "professionalId");

        SellerEntity seller = sellerRepository.findById(sellerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Synthetic seller profile was not found"));
        if (!"APPROVED".equalsIgnoreCase(seller.getStatus()) || !Boolean.TRUE.equals(seller.getStoreOpen())) {
            throw new ApiException(HttpStatus.CONFLICT, "Synthetic seller must be approved and its store must be open");
        }
        DeliveryAgentEntity agent = deliveryAgentRepository.findById(agentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Synthetic delivery profile was not found"));
        if (!"ACTIVE".equalsIgnoreCase(agent.getStatus()) || !Boolean.TRUE.equals(agent.getAvailableForJobs())) {
            throw new ApiException(HttpStatus.CONFLICT, "Synthetic delivery agent must be ACTIVE and available");
        }
        UserEntity stagingUser = resolveStagingUser(request.professionalIdentity());
        requireSameAccount(stagingUser, seller.getUserId(), "seller");
        requireSameAccount(stagingUser, agent.getUserId(), "delivery-agent");
        // Resolve from the already-verified shared account, not from a separately
        // copied provider ID that could point at another person's profile.
        DailyHelpProfessionalEntity professional = resolveProfessional(stagingUser, professionalId);
        String resolvedProfessionalId = professional.getProfessionalId();
        requireSameAccount(stagingUser, professional.getUserId(), "Daily Help professional");
        if (professionalId != null && !professionalId.equals(resolvedProfessionalId)) {
            throw new ApiException(HttpStatus.CONFLICT, "Configured professional profile ID does not match the profile linked to the shared E2E identity");
        }
        if (!Integer.valueOf(1).equals(professional.getVerified())
                || !"AVAILABLE".equalsIgnoreCase(professional.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Synthetic professional must be verified and AVAILABLE");
        }

        String suffix = UUID.nameUUIDFromBytes(runId.getBytes(StandardCharsets.UTF_8))
                .toString().replace("-", "").substring(0, 24).toUpperCase();
        String productId = "E2E-P-" + suffix;
        String serviceId = "E2E-S-" + suffix;
        String rollbackSellerId = "E2E-S2-" + suffix;
        String multiSellerValidProductId = "E2E-MV-" + suffix;
        String multiSellerFailProductId = "E2E-MF-" + suffix;
        String slotId = "E2E-T-" + suffix;
        LocalDateTime now = LocalDateTime.now();
        SellerEntity rollbackSeller = sellerRepository.findById(rollbackSellerId).orElseGet(() ->
                sellerRepository.save(SellerEntity.builder()
                        .sellerId(rollbackSellerId).storeName("E2E Synthetic Rollback Store")
                        .ownerName("E2E Synthetic Owner").email("e2e-" + suffix.toLowerCase() + "@example.test")
                        .phone("999" + suffix.substring(0, 7).replaceAll("[A-F]", "0"))
                        .category("E2E TEST").address("E2E synthetic address - do not deliver")
                        .locality("Kurali").status("APPROVED").storeOpen(true)
                        // Oracle migration V22_1 makes both compliance states NOT NULL.
                        // Synthetic fixtures have no submitted documents, so use the
                        // truthful non-submitted state instead of relying on DB defaults
                        // that Hibernate bypasses when it explicitly inserts NULL.
                        .gstVerificationStatus("NOT_SUBMITTED")
                        .fssaiVerificationStatus("NOT_SUBMITTED")
                        .registeredAt(now).approvedAt(now).e2eRunId(runId).build()));
        if (!runId.equals(rollbackSeller.getE2eRunId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Rollback seller fixture is not owned by this run");
        }
        SlotSchedule slotSchedule = slotRepository.findFirstByE2eRunId(runId)
                .map(existing -> new SlotSchedule(existing.getSlotDate(), existing.getStartTime(), existing.getEndTime()))
                .orElseGet(() -> findUnoccupiedSlot(resolvedProfessionalId, suffix));
        LocalDate slotDate = slotSchedule.date();
        LocalTime start = slotSchedule.start();
        LocalTime end = slotSchedule.end();

        ProductEntity product = productRepository.findById(productId).orElseGet(() ->
                productRepository.save(ProductEntity.builder()
                        .productId(productId).seller(seller)
                        .title("E2E Synthetic Grocery " + productId)
                        .category("E2E TEST").description("Synthetic staging test product. Not for sale or delivery.")
                        .mrp(TEST_PRICE).sellerPrice(TEST_PRICE).stock(2).unit("piece")
                        .tags("E2E,SYNTHETIC,DO-NOT-DELIVER").isFeatured(0)
                        .createdAt(now).updatedAt(now).e2eRunId(runId).build()));
        if (!productId.equals(product.getProductId()) || !sellerId.equals(product.getSeller().getSellerId())
                || !runId.equals(product.getE2eRunId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Run product fixture does not match the synthetic seller");
        }

        SellerEntity firstSeller = sellerId.compareTo(rollbackSellerId) <= 0 ? seller : rollbackSeller;
        SellerEntity secondSeller = sellerId.compareTo(rollbackSellerId) <= 0 ? rollbackSeller : seller;
        ProductEntity multiSellerValid = productRepository.findById(multiSellerValidProductId).orElseGet(() ->
                productRepository.save(ProductEntity.builder()
                        .productId(multiSellerValidProductId).seller(firstSeller)
                        .title("E2E Multi Seller Valid " + multiSellerValidProductId)
                        .category("E2E TEST").description("Synthetic rollback test product.")
                        .mrp(TEST_PRICE).sellerPrice(TEST_PRICE).stock(2).unit("piece")
                        .tags("E2E,SYNTHETIC,ROLLBACK-VALID").isFeatured(0)
                        .createdAt(now).updatedAt(now).e2eRunId(runId).build()));
        ProductEntity multiSellerFail = productRepository.findById(multiSellerFailProductId).orElseGet(() ->
                productRepository.save(ProductEntity.builder()
                        .productId(multiSellerFailProductId).seller(secondSeller)
                        .title("E2E Multi Seller Failure " + multiSellerFailProductId)
                        .category("E2E TEST").description("Synthetic zero-stock rollback test product.")
                        .mrp(TEST_PRICE).sellerPrice(TEST_PRICE).stock(0).unit("piece")
                        .tags("E2E,SYNTHETIC,ROLLBACK-FAIL").isFeatured(0)
                        .createdAt(now).updatedAt(now).e2eRunId(runId).build()));
        if (!runId.equals(multiSellerValid.getE2eRunId()) || !runId.equals(multiSellerFail.getE2eRunId())
                || !firstSeller.getSellerId().equals(multiSellerValid.getSeller().getSellerId())
                || !secondSeller.getSellerId().equals(multiSellerFail.getSeller().getSellerId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Multi-seller rollback fixtures do not belong to this run");
        }

        DailyHelpServiceEntity service = serviceRepository.findFirstByE2eRunId(runId).orElseGet(() ->
                serviceRepository.save(DailyHelpServiceEntity.builder()
                        .serviceId(serviceId).category("E2E TEST").name("E2E Synthetic Home Help")
                        .description("Synthetic staging-only test service. No real visit will occur.")
                        .pricingUnit("HOUR").pricePerHour(new BigDecimal("80.00")).minHours(1)
                        .active(1).createdAt(now).updatedAt(now).e2eRunId(runId).build()));
        if (!serviceId.equals(service.getServiceId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Run Daily Help service fixture does not match this run");
        }

        DailyHelpProfessionalSlotEntity slot = slotRepository.findFirstByE2eRunId(runId).orElseGet(() ->
                slotRepository.save(DailyHelpProfessionalSlotEntity.builder()
                        .slotId(slotId).professional(professional).slotDate(slotDate)
                        .startTime(start).endTime(end).status("AVAILABLE")
                        .createdAt(now).updatedAt(now).e2eRunId(runId).build()));
        if (!slotId.equals(slot.getSlotId()) || !resolvedProfessionalId.equals(slot.getProfessional().getProfessionalId())
                || !"AVAILABLE".equalsIgnoreCase(slot.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Run Daily Help slot is not available for the configured professional");
        }

        return new FixtureResult(productId, sellerId, agentId, serviceId, slotId, resolvedProfessionalId,
                professional.getCurrentLocality() == null ? "" : professional.getCurrentLocality(), slotDate.atTime(start).toString(),
                1, 2, TEST_PRICE.toPlainString(),
                seller.getBaseDeliveryFee() == null ? new BigDecimal("35.00") : seller.getBaseDeliveryFee(),
                rollbackSellerId, multiSellerValidProductId, multiSellerFailProductId);
    }

    /**
     * Pick a genuinely free future hour for this provider. The previous fixture
     * derived a date from a small hash space, which collided with real staging
     * availability and failed Oracle's UK_DH_PROF_SLOT unique constraint.
     * Search is read-only and never edits or reserves an existing provider slot.
     */
    private SlotSchedule findUnoccupiedSlot(String professionalId, String suffix) {
        LocalDate firstDate = LocalDate.now(ZoneId.of("Asia/Kolkata"))
                .plusDays(2 + Math.floorMod(suffix.hashCode(), 30));
        int firstHour = 9 + Math.floorMod(suffix.substring(0, 6).hashCode(), 8);
        for (int day = 0; day < 366; day++) {
            LocalDate candidateDate = firstDate.plusDays(day);
            var existingSlots = slotRepository.findByProfessionalProfessionalIdAndSlotDateOrderByStartTimeAsc(
                    professionalId, candidateDate);
            for (int offset = 0; offset < 8; offset++) {
                LocalTime candidateStart = LocalTime.of(9 + ((firstHour - 9 + offset) % 8), 0);
                LocalTime candidateEnd = candidateStart.plusHours(1);
                boolean overlaps = existingSlots.stream().anyMatch(existing ->
                        candidateStart.isBefore(existing.getEndTime())
                                && candidateEnd.isAfter(existing.getStartTime()));
                if (!overlaps) return new SlotSchedule(candidateDate, candidateStart, candidateEnd);
            }
        }
        throw new ApiException(HttpStatus.CONFLICT,
                "No unoccupied future Daily Help slot could be allocated for the staging professional");
    }

    private record SlotSchedule(LocalDate date, LocalTime start, LocalTime end) {}

    private UserEntity resolveStagingUser(String identity) {
        if (identity == null || identity.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A shared E2E account email is required for fixture ownership checks");
        }
        String value = identity.trim();
        boolean email = value.contains("@");
        String normalized = email ? value.toLowerCase() : value.replaceAll("\\D", "");
        return (email ? userRepository.findByEmail(normalized) : userRepository.findByPhone(normalized))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "The shared E2E account was not found for fixture ownership checks"));
    }

    private void requireSameAccount(UserEntity stagingUser, String profileUserId, String profileName) {
        if (profileUserId == null || !profileUserId.equals(stagingUser.getUserId())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Configured " + profileName + " profile is not owned by the shared five-role E2E account");
        }
    }

    private DailyHelpProfessionalEntity resolveProfessional(UserEntity stagingUser, String configuredProfileId) {
        var linkedProfile = professionalRepository.findByUserId(stagingUser.getUserId());
        if (linkedProfile.isPresent()) return linkedProfile.get();
        if (configuredProfileId != null) {
            return professionalRepository.findById(configuredProfileId)
                    .or(() -> professionalRepository.findByUserId(configuredProfileId))
                    .or(() -> professionalRepository.findByPhone(configuredProfileId))
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                            "Daily Help professional profile was not found for the shared E2E account or configured profile ID"));
        }
        throw new ApiException(HttpStatus.NOT_FOUND,
                "Daily Help professional profile was not found for the shared E2E account");
    }

    private String stagingProfileId(String value, String field) {
        if (value == null || !STAGING_PROFILE_ID.matcher(value.trim()).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, field + " must be a valid dedicated staging profile ID");
        }
        return value.trim();
    }

    public record PrepareRequest(String sellerId, String deliveryAgentId, String professionalId, String professionalIdentity) {}
    public record FixtureResult(String productId, String sellerId, String deliveryAgentId,
                                String serviceId, String slotId, String professionalId, String professionalLocality,
                                String scheduledStart, int requestedHours, int stock, String unitPrice, BigDecimal baseDeliveryFee,
                                String rollbackSellerId, String multiSellerValidProductId,
                                String multiSellerFailProductId) {}
}

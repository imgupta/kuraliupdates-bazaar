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
    private final ProductRepository productRepository;
    private final DailyHelpServiceRepository serviceRepository;
    private final DailyHelpProfessionalSlotRepository slotRepository;

    @Transactional
    public FixtureResult prepare(String runId, PrepareRequest request) {
        String sellerId = stagingProfileId(request.sellerId(), "sellerId");
        String agentId = stagingProfileId(request.deliveryAgentId(), "deliveryAgentId");
        String professionalId = stagingProfileId(request.professionalId(), "professionalId");

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
        // Configuration may contain either the profile primary key or its linked user ID.
        // Resolve once and use the canonical profile ID for slot creation and later API calls.
        DailyHelpProfessionalEntity professional = professionalRepository.findById(professionalId)
                .or(() -> professionalRepository.findByUserId(professionalId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Synthetic Daily Help professional was not found by professional ID or user ID"));
        String resolvedProfessionalId = professional.getProfessionalId();
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
                        .registeredAt(now).approvedAt(now).e2eRunId(runId).build()));
        if (!runId.equals(rollbackSeller.getE2eRunId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Rollback seller fixture is not owned by this run");
        }
        int dayOffset = 2 + Math.floorMod(suffix.hashCode(), 24);
        int hourOffset = Math.floorMod(suffix.substring(0, 6).hashCode(), 8);
        LocalDate slotDate = LocalDate.now(ZoneId.of("Asia/Kolkata")).plusDays(dayOffset);
        LocalTime start = LocalTime.of(9 + hourOffset, 0);
        LocalTime end = start.plusHours(1);

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
                slotDate.atTime(start).toString(), 1, 2, TEST_PRICE.toPlainString(),
                rollbackSellerId, multiSellerValidProductId, multiSellerFailProductId);
    }

    private String stagingProfileId(String value, String field) {
        if (value == null || !STAGING_PROFILE_ID.matcher(value.trim()).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, field + " must be a valid dedicated staging profile ID");
        }
        return value.trim();
    }

    public record PrepareRequest(String sellerId, String deliveryAgentId, String professionalId) {}
    public record FixtureResult(String productId, String sellerId, String deliveryAgentId,
                                String serviceId, String slotId, String professionalId,
                                String scheduledStart, int requestedHours, int stock, String unitPrice,
                                String rollbackSellerId, String multiSellerValidProductId,
                                String multiSellerFailProductId) {}
}

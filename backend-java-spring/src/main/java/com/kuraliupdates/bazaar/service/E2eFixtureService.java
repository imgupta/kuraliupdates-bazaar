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
    private static final Pattern SYNTHETIC_ID = Pattern.compile("E2E-[A-Za-z0-9_-]{3,80}");
    private static final BigDecimal TEST_PRICE = new BigDecimal("20.00");

    private final SellerRepository sellerRepository;
    private final DeliveryAgentRepository deliveryAgentRepository;
    private final DailyHelpProfessionalRepository professionalRepository;
    private final ProductRepository productRepository;
    private final DailyHelpServiceRepository serviceRepository;
    private final DailyHelpProfessionalSlotRepository slotRepository;

    @Transactional
    public FixtureResult prepare(String runId, PrepareRequest request) {
        String sellerId = syntheticId(request.sellerId(), "sellerId");
        String agentId = syntheticId(request.deliveryAgentId(), "deliveryAgentId");
        String professionalId = syntheticId(request.professionalId(), "professionalId");

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
        DailyHelpProfessionalEntity professional = professionalRepository.findById(professionalId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Synthetic Daily Help professional was not found"));
        if (!Integer.valueOf(1).equals(professional.getVerified())
                || !"AVAILABLE".equalsIgnoreCase(professional.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Synthetic professional must be verified and AVAILABLE");
        }

        String suffix = UUID.nameUUIDFromBytes(runId.getBytes(StandardCharsets.UTF_8))
                .toString().replace("-", "").substring(0, 24).toUpperCase();
        String productId = "E2E-P-" + suffix;
        String serviceId = "E2E-S-" + suffix;
        String slotId = "E2E-T-" + suffix;
        LocalDateTime now = LocalDateTime.now();
        LocalDate slotDate = LocalDate.now(ZoneId.of("Asia/Kolkata")).plusDays(2);
        LocalTime start = LocalTime.of(10, 0);
        LocalTime end = LocalTime.of(11, 0);

        ProductEntity product = productRepository.findFirstByE2eRunId(runId).orElseGet(() ->
                productRepository.save(ProductEntity.builder()
                        .productId(productId).seller(seller)
                        .title("E2E Synthetic Grocery " + suffix.substring(0, 6))
                        .category("E2E TEST").description("Synthetic staging test product. Not for sale or delivery.")
                        .mrp(TEST_PRICE).sellerPrice(TEST_PRICE).stock(2).unit("piece")
                        .tags("E2E,SYNTHETIC,DO-NOT-DELIVER").isFeatured(0)
                        .createdAt(now).updatedAt(now).e2eRunId(runId).build()));
        if (!productId.equals(product.getProductId()) || !sellerId.equals(product.getSeller().getSellerId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Run product fixture does not match the synthetic seller");
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
        if (!slotId.equals(slot.getSlotId()) || !professionalId.equals(slot.getProfessional().getProfessionalId())
                || !"AVAILABLE".equalsIgnoreCase(slot.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Run Daily Help slot is not available for the configured professional");
        }

        return new FixtureResult(productId, sellerId, agentId, serviceId, slotId, professionalId,
                slotDate.atTime(start).toString(), 1, 2, TEST_PRICE.toPlainString());
    }

    private String syntheticId(String value, String field) {
        if (value == null || !SYNTHETIC_ID.matcher(value.trim()).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, field + " must be a synthetic E2E- profile ID");
        }
        return value.trim();
    }

    public record PrepareRequest(String sellerId, String deliveryAgentId, String professionalId) {}
    public record FixtureResult(String productId, String sellerId, String deliveryAgentId,
                                String serviceId, String slotId, String professionalId,
                                String scheduledStart, int requestedHours, int stock, String unitPrice) {}
}

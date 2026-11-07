package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.*;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class E2eFixtureServiceTest {
    @Mock private SellerRepository sellers;
    @Mock private DeliveryAgentRepository agents;
    @Mock private DailyHelpProfessionalRepository professionals;
    @Mock private ProductRepository products;
    @Mock private DailyHelpServiceRepository services;
    @Mock private DailyHelpProfessionalSlotRepository slots;
    @InjectMocks private E2eFixtureService fixtureService;

    @Test
    void createsRunTaggedFixturesOnlyForApprovedDedicatedStagingProfiles() {
        String runId = "E2E-run-123";
        SellerEntity seller = SellerEntity.builder().sellerId("stage-seller-01").status("APPROVED").storeOpen(true).build();
        DeliveryAgentEntity agent = DeliveryAgentEntity.builder().agentId("stage-agent-01").status("ACTIVE").availableForJobs(true).build();
        DailyHelpProfessionalEntity professional = DailyHelpProfessionalEntity.builder()
                .professionalId("stage-provider-01").verified(1).status("AVAILABLE").build();
        when(sellers.findById("stage-seller-01")).thenReturn(Optional.of(seller));
        when(sellers.findById(argThat(id -> id != null && id.startsWith("E2E-S2-")))).thenReturn(Optional.empty());
        when(sellers.save(any(SellerEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(agents.findById("stage-agent-01")).thenReturn(Optional.of(agent));
        // The configured identifier may be the linked USER_ID, not the profile primary key.
        when(professionals.findById("stage-provider-user-01")).thenReturn(Optional.empty());
        when(professionals.findByUserId("stage-provider-user-01")).thenReturn(Optional.of(professional));
        when(products.findById(argThat(id -> id != null && id.startsWith("E2E-P-")))).thenReturn(Optional.empty());
        when(services.findFirstByE2eRunId(runId)).thenReturn(Optional.empty());
        when(slots.findFirstByE2eRunId(runId)).thenReturn(Optional.empty());
        when(products.findById(argThat(id -> id != null && id.startsWith("E2E-MV-")))).thenReturn(Optional.empty());
        when(products.findById(argThat(id -> id != null && id.startsWith("E2E-MF-")))).thenReturn(Optional.empty());
        when(products.save(any(ProductEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(services.save(any(DailyHelpServiceEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(slots.save(any(DailyHelpProfessionalSlotEntity.class))).thenAnswer(i -> i.getArgument(0));

        var result = fixtureService.prepare(runId,
                new E2eFixtureService.PrepareRequest("stage-seller-01", "stage-agent-01", "stage-provider-user-01"));

        assertTrue(result.productId().startsWith("E2E-P-"));
        assertTrue(result.serviceId().startsWith("E2E-S-"));
        assertTrue(result.slotId().startsWith("E2E-T-"));
        assertEquals("stage-seller-01", result.sellerId());
        assertEquals("stage-agent-01", result.deliveryAgentId());
        assertEquals("stage-provider-01", result.professionalId(),
                "fixture result must expose the canonical PROFESSIONAL_ID, not the configured USER_ID");
        verify(professionals).findByUserId("stage-provider-user-01");
        assertTrue(result.rollbackSellerId().startsWith("E2E-S2-"));
        assertTrue(result.multiSellerValidProductId().startsWith("E2E-MV-"));
        assertTrue(result.multiSellerFailProductId().startsWith("E2E-MF-"));
        verify(sellers).save(argThat(s -> runId.equals(s.getE2eRunId()) && s.getSellerId().startsWith("E2E-S2-")));
        verify(products, times(3)).save(argThat(p -> runId.equals(p.getE2eRunId())));
        verify(services).save(argThat(s -> runId.equals(s.getE2eRunId()) && s.getActive() == 1));
        verify(slots).save(argThat(s -> runId.equals(s.getE2eRunId())
                && "AVAILABLE".equals(s.getStatus())));
    }

    @Test
    void rejectsMalformedProfileIdsBeforeAnyDatabaseAccess() {
        assertThrows(ApiException.class, () -> fixtureService.prepare("E2E-run-123",
                new E2eFixtureService.PrepareRequest("seller id with spaces", "stage-agent-01", "stage-provider-01")));
        verifyNoInteractions(sellers, agents, professionals, products, services, slots);
    }

    @Test
    void rejectsPendingSellerWithoutCreatingFixtures() {
        when(sellers.findById("stage-seller-01")).thenReturn(Optional.of(
                SellerEntity.builder().sellerId("stage-seller-01").status("PENDING").storeOpen(true).build()));
        assertThrows(ApiException.class, () -> fixtureService.prepare("E2E-run-123",
                new E2eFixtureService.PrepareRequest("stage-seller-01", "stage-agent-01", "stage-provider-01")));
        verifyNoInteractions(products, services, slots);
    }
}

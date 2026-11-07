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
    @Mock private UserRepository users;
    @Mock private ProductRepository products;
    @Mock private DailyHelpServiceRepository services;
    @Mock private DailyHelpProfessionalSlotRepository slots;
    @InjectMocks private E2eFixtureService fixtureService;

    @Test
    void createsRunTaggedFixturesOnlyForApprovedDedicatedStagingProfiles() {
        String runId = "E2E-run-123";
        UserEntity provider = UserEntity.builder().userId("stage-provider-user-01")
                .email("provider@example.test").phone("9876543210").build();
        SellerEntity seller = SellerEntity.builder().sellerId("stage-seller-01").userId(provider.getUserId())
                .status("APPROVED").storeOpen(true).build();
        DeliveryAgentEntity agent = DeliveryAgentEntity.builder().agentId("stage-agent-01").userId(provider.getUserId())
                .status("ACTIVE").availableForJobs(true).build();
        DailyHelpProfessionalEntity professional = DailyHelpProfessionalEntity.builder()
                .professionalId("stage-provider-01").userId(provider.getUserId()).verified(1).status("AVAILABLE").build();
        when(sellers.findById("stage-seller-01")).thenReturn(Optional.of(seller));
        when(agents.findById("stage-agent-01")).thenReturn(Optional.of(agent));
        when(users.findByEmail("provider@example.test")).thenReturn(Optional.of(provider));
        when(professionals.findByUserId("stage-provider-user-01")).thenReturn(Optional.of(professional));
        when(products.findById(argThat(id -> id != null && id.startsWith("E2E-P-")))).thenReturn(Optional.empty());
        when(products.findById(argThat(id -> id != null && id.startsWith("E2E-MV-")))).thenReturn(Optional.empty());
        when(products.findById(argThat(id -> id != null && id.startsWith("E2E-MF-")))).thenReturn(Optional.empty());
        when(sellers.findById(argThat(id -> id != null && id.startsWith("E2E-S2-")))).thenReturn(Optional.empty());
        when(sellers.save(any(SellerEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(products.save(any(ProductEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(services.findFirstByE2eRunId(runId)).thenReturn(Optional.empty());
        when(slots.findFirstByE2eRunId(runId)).thenReturn(Optional.empty());
        when(services.save(any(DailyHelpServiceEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(slots.save(any(DailyHelpProfessionalSlotEntity.class))).thenAnswer(i -> i.getArgument(0));

        var result = fixtureService.prepare(runId,
                new E2eFixtureService.PrepareRequest("stage-seller-01", "stage-agent-01", null, "provider@example.test"));

        assertTrue(result.productId().startsWith("E2E-P-"));
        assertTrue(result.serviceId().startsWith("E2E-S-"));
        assertTrue(result.slotId().startsWith("E2E-T-"));
        assertEquals("stage-seller-01", result.sellerId());
        assertEquals("stage-agent-01", result.deliveryAgentId());
        assertEquals("stage-provider-01", result.professionalId(),
                "fixture result must expose the canonical PROFESSIONAL_ID, not the configured USER_ID");
        verify(users).findByEmail("provider@example.test");
        verify(professionals).findByUserId("stage-provider-user-01");
        assertTrue(result.rollbackSellerId().startsWith("E2E-S2-"));
        assertTrue(result.multiSellerValidProductId().startsWith("E2E-MV-"));
        assertTrue(result.multiSellerFailProductId().startsWith("E2E-MF-"));
        verify(sellers).save(argThat(s -> runId.equals(s.getE2eRunId()) && s.getSellerId().startsWith("E2E-S2-")
                && "NOT_SUBMITTED".equals(s.getGstVerificationStatus())
                && "NOT_SUBMITTED".equals(s.getFssaiVerificationStatus())));
        verify(products, times(3)).save(argThat(p -> runId.equals(p.getE2eRunId())));
        verify(services).save(argThat(s -> runId.equals(s.getE2eRunId()) && s.getActive() == 1));
        verify(slots).save(argThat(s -> runId.equals(s.getE2eRunId())
                && "AVAILABLE".equals(s.getStatus())));
    }


    @Test
    void rejectsStaleProfessionalIdWhenSharedIdentityResolvesDifferentProfile() {
        String runId = "E2E-run-identity";
        UserEntity provider = UserEntity.builder().userId("stage-provider-user-01").email("provider@example.test").phone("9876543210").build();
        SellerEntity seller = SellerEntity.builder().sellerId("stage-seller-01").userId(provider.getUserId()).status("APPROVED").storeOpen(true).build();
        DeliveryAgentEntity agent = DeliveryAgentEntity.builder().agentId("stage-agent-01").userId(provider.getUserId()).status("ACTIVE").availableForJobs(true).build();
        DailyHelpProfessionalEntity professional = DailyHelpProfessionalEntity.builder()
                .professionalId("stage-provider-canonical").userId(provider.getUserId())
                .verified(1).status("AVAILABLE").build();
        when(sellers.findById("stage-seller-01")).thenReturn(Optional.of(seller));
        when(agents.findById("stage-agent-01")).thenReturn(Optional.of(agent));
        when(users.findByEmail("provider@example.test")).thenReturn(Optional.of(provider));
        when(professionals.findByUserId(provider.getUserId())).thenReturn(Optional.of(professional));

        ApiException error = assertThrows(ApiException.class, () -> fixtureService.prepare(runId,
                new E2eFixtureService.PrepareRequest("stage-seller-01", "stage-agent-01", "stale-provider-id", "PROVIDER@example.test")));

        assertEquals(org.springframework.http.HttpStatus.CONFLICT, error.getStatus());
        verify(users).findByEmail("provider@example.test");
        verify(professionals).findByUserId("stage-provider-user-01");
        verifyNoInteractions(products, services, slots);
    }

    @Test
    void rejectsMalformedProfileIdsBeforeAnyDatabaseAccess() {
        assertThrows(ApiException.class, () -> fixtureService.prepare("E2E-run-123",
                new E2eFixtureService.PrepareRequest("seller id with spaces", "stage-agent-01", "stage-provider-01", null)));
        verifyNoInteractions(sellers, agents, professionals, users, products, services, slots);
    }

    @Test
    void rejectsPendingSellerWithoutCreatingFixtures() {
        when(sellers.findById("stage-seller-01")).thenReturn(Optional.of(
                SellerEntity.builder().sellerId("stage-seller-01").status("PENDING").storeOpen(true).build()));
        assertThrows(ApiException.class, () -> fixtureService.prepare("E2E-run-123",
                new E2eFixtureService.PrepareRequest("stage-seller-01", "stage-agent-01", "stage-provider-01", null)));
        verifyNoInteractions(products, services, slots);
    }
}

package com.kuraliupdates.bazaar.dto.admin;

import tools.jackson.databind.json.JsonMapper;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AdminResponseDtoTest {
    @Test
    void adminSellerDtoOmitsInternalProxyAndE2eMetadata() throws Exception {
        SellerEntity seller = SellerEntity.builder()
                .sellerId("seller-1")
                .storeName("Test Store")
                .ownerName("Owner")
                .email("owner@example.test")
                .phone("9999999999")
                .agreementAcceptedIp("203.0.113.10")
                .e2eRunId("internal-run")
                .build();

        String json = JsonMapper.builder().build().writeValueAsString(AdminSellerResponse.from(seller));

        assertTrue(json.contains("\"sellerId\":\"seller-1\""));
        assertFalse(json.contains("agreementAcceptedIp"));
        assertFalse(json.contains("203.0.113.10"));
        assertFalse(json.contains("e2eRunId"));
        assertFalse(json.contains("internal-run"));
    }
}

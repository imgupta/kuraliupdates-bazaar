package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.SellerDocumentEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.SellerDocumentRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.MalwareScanner;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SellerDocumentControllerTest {
    private static final String SELLER_ID = "E2E-SELLER-UNIT";
    private static final String DOCUMENT_ID = "E2E-DOC-UNIT";
    private static final byte[] PDF = "%PDF-1.7 synthetic test document".getBytes();

    @Mock private AuthService authService;
    @Mock private SellerRepository sellerRepository;
    @Mock private SellerDocumentRepository docs;
    @Mock private MalwareScanner malwareScanner;
    @InjectMocks private SellerDocumentController controller;

    private final var admin = new UsernamePasswordAuthenticationToken(
            "unit-admin", "n/a", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

    @BeforeEach
    void setUp() {
        when(authService.requireUser("seller-token")).thenReturn(
                UserEntity.builder().userId("E2E-USER-UNIT").build());
        when(sellerRepository.findByUserId("E2E-USER-UNIT")).thenReturn(Optional.of(
                SellerEntity.builder().sellerId(SELLER_ID).build()));
    }

    @Test
    void cleanUploadIsPersistedAndReturnedAsCreated() throws Exception {
        when(malwareScanner.scan(any(byte[].class))).thenReturn(MalwareScanner.ScanResult.CLEAN);
        when(docs.save(any(SellerDocumentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<Map<String, Object>> response = controller.upload(
                "Bearer seller-token", "SHOP_FRONT_PHOTO",
                new MockMultipartFile("file", "shop front.pdf", "application/pdf", PDF));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("CLEAN", response.getBody().get("scanStatus"));
        assertEquals("PENDING", response.getBody().get("verificationStatus"));
        ArgumentCaptor<SellerDocumentEntity> saved = ArgumentCaptor.forClass(SellerDocumentEntity.class);
        verify(docs, atLeast(2)).save(saved.capture());
        SellerDocumentEntity finalDocument = saved.getAllValues().get(saved.getAllValues().size() - 1);
        assertEquals(SELLER_ID, finalDocument.getSellerId());
        assertEquals("SHOP_FRONT_PHOTO", finalDocument.getDocumentType());
        assertEquals("CLEAN", finalDocument.getScanStatus());
        assertArrayEquals(PDF, finalDocument.getDocumentData());
    }

    @Test
    void scannerFailureKeepsUploadQuarantinedAndReturnsAccepted() throws Exception {
        when(malwareScanner.scan(any(byte[].class))).thenThrow(new IllegalStateException("scanner unavailable"));
        when(docs.save(any(SellerDocumentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<Map<String, Object>> response = controller.upload(
                "Bearer seller-token", "GST_CERTIFICATE",
                new MockMultipartFile("file", "gst.pdf", "application/pdf", PDF));

        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        assertEquals("SCAN_FAILED", response.getBody().get("scanStatus"));
        ArgumentCaptor<SellerDocumentEntity> saved = ArgumentCaptor.forClass(SellerDocumentEntity.class);
        verify(docs, atLeast(2)).save(saved.capture());
        SellerDocumentEntity finalDocument = saved.getAllValues().get(saved.getAllValues().size() - 1);
        assertEquals("SCAN_FAILED", finalDocument.getScanStatus());
        assertEquals("PENDING", finalDocument.getVerificationStatus());
        assertNull(finalDocument.getScannedAt());
    }

    @Test
    void adminCannotVerifyRejectedDocumentWithoutCorrectionReason() {
        SellerDocumentEntity document = cleanDocument();
        when(docs.findByDocumentIdAndSellerId(DOCUMENT_ID, SELLER_ID)).thenReturn(Optional.of(document));

        ApiException error = assertThrows(ApiException.class, () -> controller.verify(
                SELLER_ID, DOCUMENT_ID, "REJECTED", "  ", admin));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        verify(docs, never()).save(any(SellerDocumentEntity.class));
    }

    @Test
    void adminCanRejectCleanDocumentWithReasonAndAuditIdentity() {
        SellerDocumentEntity document = cleanDocument();
        when(docs.findByDocumentIdAndSellerId(DOCUMENT_ID, SELLER_ID)).thenReturn(Optional.of(document));
        when(docs.save(any(SellerDocumentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> response = controller.verify(
                SELLER_ID, DOCUMENT_ID, "rejected", "Please upload a clearer shop-front image.", admin);

        assertEquals(Boolean.TRUE, response.get("success"));
        assertEquals("REJECTED", document.getVerificationStatus());
        assertEquals("Please upload a clearer shop-front image.", document.getRejectionReason());
        assertEquals("unit-admin", document.getVerifiedBy());
        assertNotNull(document.getVerifiedAt());
        verify(docs).save(document);
    }

    @Test
    void adminCannotDownloadDocumentUntilMalwareScanIsClean() {
        SellerDocumentEntity document = cleanDocument();
        document.setScanStatus("SCAN_FAILED");
        when(docs.findByDocumentIdAndSellerId(DOCUMENT_ID, SELLER_ID)).thenReturn(Optional.of(document));

        ApiException error = assertThrows(ApiException.class,
                () -> controller.download(SELLER_ID, DOCUMENT_ID, admin));

        assertEquals(HttpStatus.LOCKED, error.getStatus());
    }

    @Test
    void adminCannotVerifyDocumentUntilMalwareScanIsClean() {
        SellerDocumentEntity document = cleanDocument();
        document.setScanStatus("INFECTED");
        when(docs.findByDocumentIdAndSellerId(DOCUMENT_ID, SELLER_ID)).thenReturn(Optional.of(document));

        ApiException error = assertThrows(ApiException.class, () -> controller.verify(
                SELLER_ID, DOCUMENT_ID, "VERIFIED", null, admin));

        assertEquals(HttpStatus.LOCKED, error.getStatus());
        verify(docs, never()).save(any(SellerDocumentEntity.class));
    }

    private SellerDocumentEntity cleanDocument() {
        return SellerDocumentEntity.builder()
                .documentId(DOCUMENT_ID).sellerId(SELLER_ID).documentType("SHOP_FRONT_PHOTO")
                .fileName("shop.pdf").contentType("application/pdf").fileSize((long) PDF.length)
                .documentData(PDF).verificationStatus("PENDING").scanStatus("CLEAN")
                .scanResult("ClamAV reported clean").uploadedAt(java.time.LocalDateTime.now()).build();
    }
}

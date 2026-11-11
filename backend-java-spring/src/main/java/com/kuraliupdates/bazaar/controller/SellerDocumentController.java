package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.*;
import com.kuraliupdates.bazaar.repository.*;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.service.MalwareScanner;
import com.kuraliupdates.bazaar.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class SellerDocumentController {
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Set<String> TYPES = Set.of("GST_CERTIFICATE", "FSSAI_CERTIFICATE",
            "SHOP_FRONT_PHOTO", "SHOP_INTERIOR_PHOTO", "TRADE_LICENSE", "UDYAM_CERTIFICATE");
    private static final Set<String> MIMES = Set.of("application/pdf", "image/jpeg", "image/png");

    private final AuthService authService;
    private final SellerRepository sellerRepository;
    private final SellerDocumentRepository docs;
    private final MalwareScanner malwareScanner;

    @PostMapping(value = "/sellers/me/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> upload(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestParam String documentType, @RequestParam MultipartFile file) throws IOException {
        UserEntity user = authService.requireUser(bearer(auth));
        requireSellerSession(bearer(auth));
        SellerEntity seller = sellerRepository.findByUserId(user.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Seller profile required"));
        String type = documentType.trim().toUpperCase(Locale.ROOT);
        String mime = Optional.ofNullable(file.getContentType()).orElse("").toLowerCase(Locale.ROOT);
        if (!TYPES.contains(type)) throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported document type");
        if (file.isEmpty() || file.getSize() > MAX_BYTES)
            throw new ApiException(HttpStatus.BAD_REQUEST, "File must be between 1 byte and 5 MB");
        if (!MIMES.contains(mime))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only PDF, JPEG and PNG files are accepted");
        byte[] bytes = file.getBytes();
        if (!signature(mime, bytes))
            throw new ApiException(HttpStatus.BAD_REQUEST, "File signature does not match its content type");

        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("document")
                .replaceAll("[^A-Za-z0-9._-]", "_");
        SellerDocumentEntity document = docs.save(SellerDocumentEntity.builder()
                .documentId("sdoc-" + UUID.randomUUID()).sellerId(seller.getSellerId())
                .documentType(type).fileName(name).contentType(mime).fileSize((long) bytes.length)
                .documentData(bytes).verificationStatus("PENDING").scanStatus("QUARANTINED")
                .scanResult("Awaiting malware scan").uploadedAt(LocalDateTime.now()).build());

        boolean clean = scanAndPersist(document);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("documentId", document.getDocumentId());
        response.put("verificationStatus", document.getVerificationStatus());
        response.put("scanStatus", document.getScanStatus());
        response.put("message", clean ? "Document passed malware scanning and is awaiting admin review"
                : "Document is quarantined and unavailable until a malware scan succeeds");
        return ResponseEntity.status(clean ? HttpStatus.CREATED : HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/sellers/me/documents")
    public List<Map<String, Object>> mine(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        UserEntity user = authService.requireUser(bearer(auth));
        requireSellerSession(bearer(auth));
        SellerEntity seller = sellerRepository.findByUserId(user.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Seller profile required"));
        return metadata(seller.getSellerId());
    }

    @GetMapping("/admin/sellers/{sellerId}/documents")
    public List<Map<String, Object>> adminList(@PathVariable String sellerId, Authentication auth) {
        admin(auth);
        return metadata(sellerId);
    }

    @GetMapping("/admin/sellers/{sellerId}/documents/{documentId}")
    public ResponseEntity<byte[]> download(@PathVariable String sellerId, @PathVariable String documentId,
                                           Authentication auth) {
        admin(auth);
        SellerDocumentEntity document = findDocument(sellerId, documentId);
        requireClean(document);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(document.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(document.getFileName()).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store, private")
                .header("X-Content-Type-Options", "nosniff")
                .body(document.getDocumentData());
    }

    @PostMapping("/admin/sellers/{sellerId}/documents/{documentId}/scan")
    public Map<String, Object> rescan(@PathVariable String sellerId, @PathVariable String documentId,
                                      Authentication auth) {
        admin(auth);
        SellerDocumentEntity document = findDocument(sellerId, documentId);
        if ("CLEAN".equals(document.getScanStatus())) {
            return Map.of("success", true, "scanStatus", "CLEAN", "message", "Document already passed scanning");
        }
        boolean clean = scanAndPersist(document);
        return Map.of("success", clean, "scanStatus", document.getScanStatus(),
                "message", clean ? "Document passed malware scanning" :
                        "Document remains quarantined; scanner did not return a clean result");
    }

    @PostMapping("/admin/sellers/{sellerId}/documents/{documentId}/verification")
    public Map<String, Object> verify(@PathVariable String sellerId, @PathVariable String documentId,
                                      @RequestParam String status, @RequestParam(required = false) String reason,
                                      Authentication auth) {
        admin(auth);
        SellerDocumentEntity document = findDocument(sellerId, documentId);
        requireClean(document);
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("VERIFIED", "REJECTED").contains(normalized))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Status must be VERIFIED or REJECTED");
        String normalizedReason = reason == null ? "" : reason.trim();
        if ("REJECTED".equals(normalized)
                && (normalizedReason.isBlank() || normalizedReason.length() > 1000))
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "A rejection reason between 1 and 1000 characters is required");
        document.setVerificationStatus(normalized);
        document.setVerifiedBy(auth.getName());
        document.setVerifiedAt(LocalDateTime.now());
        document.setRejectionReason("REJECTED".equals(normalized) ? normalizedReason : null);
        docs.save(document);
        return Map.of("success", true, "verificationStatus", normalized);
    }

    private boolean scanAndPersist(SellerDocumentEntity document) {
        document.setScanStatus("QUARANTINED");
        document.setScanResult("Scan in progress");
        docs.save(document);
        try {
            MalwareScanner.ScanResult result = malwareScanner.scan(document.getDocumentData());
            document.setScanStatus(result == MalwareScanner.ScanResult.CLEAN ? "CLEAN" : "INFECTED");
            document.setScanResult(result == MalwareScanner.ScanResult.CLEAN
                    ? "ClamAV reported clean" : "ClamAV detected malware");
            document.setScannedAt(LocalDateTime.now());
            document.setScannerVersion("ClamAV clamd INSTREAM");
            docs.save(document);
            return result == MalwareScanner.ScanResult.CLEAN;
        } catch (RuntimeException exception) {
            document.setScanStatus("SCAN_FAILED");
            document.setScanResult("Scanner unavailable, timed out, or returned an indeterminate result");
            document.setScannedAt(null);
            document.setScannerVersion(null);
            docs.save(document);
            return false;
        }
    }

    private void requireClean(SellerDocumentEntity document) {
        if (!"CLEAN".equals(document.getScanStatus()))
            throw new ApiException(HttpStatus.LOCKED, "Document is quarantined until malware scanning succeeds");
    }

    private SellerDocumentEntity findDocument(String sellerId, String documentId) {
        return docs.findByDocumentIdAndSellerId(documentId, sellerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    private List<Map<String, Object>> metadata(String sellerId) {
        return docs.findBySellerIdOrderByUploadedAtDesc(sellerId).stream().map(document -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("documentId", document.getDocumentId());
            map.put("documentType", document.getDocumentType());
            map.put("fileName", document.getFileName());
            map.put("contentType", document.getContentType());
            map.put("fileSize", document.getFileSize());
            map.put("verificationStatus", document.getVerificationStatus());
            map.put("scanStatus", document.getScanStatus());
            map.put("scanResult", document.getScanResult());
            map.put("scannedAt", document.getScannedAt());
            map.put("uploadedAt", document.getUploadedAt());
            map.put("verifiedAt", document.getVerifiedAt());
            map.put("rejectionReason", document.getRejectionReason());
            return map;
        }).toList();
    }

    private void admin(Authentication auth) {
        if (auth == null || auth.getAuthorities().stream()
                .noneMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority())))
            throw new ApiException(HttpStatus.FORBIDDEN, "Administrator access required");
    }

    private void requireSellerSession(String token) {
        if (!"SELLER".equalsIgnoreCase(authService.requireSessionRole(token)))
            throw new ApiException(HttpStatus.FORBIDDEN, "An active seller session is required");
    }

    private String bearer(String header) {
        return header != null && header.startsWith("Bearer ") ? header.substring(7).trim() : null;
    }

    private boolean signature(String mime, byte[] bytes) {
        if (bytes.length < 4) return false;
        if ("application/pdf".equals(mime))
            return bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F';
        if ("image/png".equals(mime))
            return bytes.length >= 8 && (bytes[0] & 255) == 137 && bytes[1] == 80
                    && bytes[2] == 78 && bytes[3] == 71;
        return (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255;
    }
}

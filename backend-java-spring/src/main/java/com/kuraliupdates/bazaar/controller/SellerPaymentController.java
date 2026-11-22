package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.service.SellerService;
import com.kuraliupdates.bazaar.service.SellerDirectPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/sellers/me")
@RequiredArgsConstructor
public class SellerPaymentController {
    private final SellerService sellerService;
    private final SellerDirectPaymentService payments;

    @GetMapping("/payment-destination")
    public ResponseEntity<Map<String,Object>> destination(@RequestHeader(value="Authorization",required=false) String authorization) {
        SellerEntity seller = currentSeller(authorization);
        return ResponseEntity.ok(payments.destination(seller.getSellerId()));
    }

    @PutMapping("/payment-destination")
    public ResponseEntity<Map<String,Object>> saveDestination(@RequestHeader(value="Authorization",required=false) String authorization,
            @RequestBody Map<String,String> body) {
        SellerEntity seller = currentSeller(authorization);
        return ResponseEntity.ok(payments.saveSellerDestination(seller, body == null ? null : body.get("upiId"),
                body == null ? null : body.get("payeeName"), seller.getEmail()));
    }

    @GetMapping("/payments")
    public ResponseEntity<java.util.List<Map<String,Object>>> payments(@RequestHeader(value="Authorization",required=false) String authorization) {
        return ResponseEntity.ok(payments.sellerPayments(currentSeller(authorization).getSellerId()));
    }

    @PostMapping("/payments/{paymentId}/decision")
    public ResponseEntity<Map<String,Object>> decide(@RequestHeader(value="Authorization",required=false) String authorization,
            @PathVariable String paymentId, @RequestBody Map<String,Object> body) {
        SellerEntity seller = currentSeller(authorization);
        boolean confirm = body != null && Boolean.TRUE.equals(body.get("confirm"));
        String reason = body == null ? null : String.valueOf(body.getOrDefault("reason", ""));
        return ResponseEntity.ok(payments.sellerDecision(seller.getSellerId(), paymentId, confirm, reason, seller.getEmail()));
    }

    @PostMapping("/payments/{paymentId}/refund")
    public ResponseEntity<Map<String,Object>> refund(@RequestHeader(value="Authorization",required=false) String authorization,
            @PathVariable String paymentId, @RequestBody Map<String,String> body) {
        SellerEntity seller = currentSeller(authorization);
        return ResponseEntity.ok(payments.sellerRefund(seller.getSellerId(), paymentId,
                body == null ? null : body.get("action"), body == null ? null : body.get("reference"),
                body == null ? null : body.get("reason"), seller.getEmail()));
    }

    private SellerEntity currentSeller(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED);
        return sellerService.getCurrentSeller(authorization.substring(7).trim());
    }
}

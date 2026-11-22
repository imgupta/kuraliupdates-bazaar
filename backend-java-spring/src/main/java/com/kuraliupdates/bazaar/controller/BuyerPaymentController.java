package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.SellerDirectPaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/buyers/orders")
@RequiredArgsConstructor
public class BuyerPaymentController {
    private final SellerDirectPaymentService payments;

    @GetMapping("/{orderId}/payment")
    public ResponseEntity<Map<String,Object>> payment(@PathVariable String orderId, Authentication auth) {
        UserEntity buyer = requireBuyer(auth);
        return ResponseEntity.ok(payments.buyerPayment(orderId, buyer.getEmail()));
    }

    @PostMapping("/{orderId}/payment/utr")
    public ResponseEntity<Map<String,Object>> submitUtr(@PathVariable String orderId,
            @RequestBody Map<String,String> body, Authentication auth) {
        UserEntity buyer = requireBuyer(auth);
        return ResponseEntity.ok(payments.submitUtr(orderId, buyer.getEmail(),
                body == null ? null : body.get("utrReference"), body == null ? null : body.get("idempotencyKey")));
    }

    @PostMapping("/{orderId}/payment/refund")
    public ResponseEntity<Map<String,Object>> requestRefund(@PathVariable String orderId,
            @RequestBody Map<String,String> body, Authentication auth) {
        UserEntity buyer = requireBuyer(auth);
        return ResponseEntity.ok(payments.requestRefund(orderId, buyer.getEmail(), body == null ? null : body.get("reason")));
    }

    @PostMapping("/{orderId}/issues")
    public ResponseEntity<Map<String,Object>> issue(@PathVariable String orderId,
            @RequestBody Map<String,String> body, Authentication auth) {
        UserEntity buyer = requireBuyer(auth);
        return ResponseEntity.status(HttpStatus.CREATED).body(payments.createIssue(orderId, buyer.getEmail(),
                body == null ? null : body.get("issueType"), body == null ? null : body.get("description")));
    }

    private UserEntity requireBuyer(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof UserEntity user))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authenticated buyer session is required");
        boolean allowed = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority)
                .anyMatch(a -> "ROLE_BUYER".equalsIgnoreCase(a));
        if (!allowed) throw new ApiException(HttpStatus.FORBIDDEN, "Active session is not a buyer session");
        return user;
    }
}

package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.SellerReturnService;
import com.kuraliupdates.bazaar.service.SellerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class SellerReturnController {
    private final SellerReturnService returns;
    private final SellerService sellers;

    @PostMapping("/buyers/orders/{orderId}/returns")
    public ResponseEntity<Map<String,Object>> request(@PathVariable String orderId,@RequestBody Map<String,Object> body,Authentication auth) {
        UserEntity buyer=requireRole(auth,"ROLE_BUYER");
        String itemId=body==null?null:String.valueOf(body.getOrDefault("itemId",""));
        int quantity;
        try { quantity=Integer.parseInt(String.valueOf(body==null?null:body.get("quantity"))); }
        catch(Exception ex){throw new ApiException(HttpStatus.BAD_REQUEST,"A valid return quantity is required");}
        String reason=body==null?null:String.valueOf(body.getOrDefault("reason",""));
        return ResponseEntity.status(HttpStatus.CREATED).body(returns.request(orderId,itemId,quantity,reason,buyer));
    }

    @GetMapping("/buyers/me/returns")
    public ResponseEntity<List<Map<String,Object>>> buyerReturns(Authentication auth) {
        return ResponseEntity.ok(returns.buyerCases(requireRole(auth,"ROLE_BUYER").getUserId()));
    }

    @GetMapping("/sellers/me/returns")
    public ResponseEntity<List<Map<String,Object>>> sellerReturns(@RequestHeader(value="Authorization",required=false) String authorization) {
        return ResponseEntity.ok(returns.sellerCases(currentSeller(authorization).getSellerId()));
    }

    @PostMapping("/sellers/me/returns/{returnId}/decision")
    public ResponseEntity<Map<String,Object>> decision(@PathVariable String returnId,@RequestBody Map<String,String> body,@RequestHeader(value="Authorization",required=false) String authorization) {
        SellerEntity seller=currentSeller(authorization);
        boolean approve=body!=null && Boolean.parseBoolean(body.get("approve"));
        return ResponseEntity.ok(returns.sellerDecision(seller.getSellerId(),returnId,approve,body==null?null:body.get("reason"),seller.getEmail()));
    }

    @PostMapping("/sellers/me/returns/{returnId}/refund")
    public ResponseEntity<Map<String,Object>> refund(@PathVariable String returnId,@RequestBody Map<String,String> body,@RequestHeader(value="Authorization",required=false) String authorization) {
        SellerEntity seller=currentSeller(authorization);
        return ResponseEntity.ok(returns.sellerRefund(seller.getSellerId(),returnId,body==null?null:body.get("action"),
                body==null?null:body.get("method"),body==null?null:body.get("reference"),seller.getEmail()));
    }

    @GetMapping("/delivery/returns/available")
    public ResponseEntity<List<Map<String,Object>>> available(Authentication auth) {
        return ResponseEntity.ok(returns.availablePickupJobs(requireRole(auth,"ROLE_DELIVERY")));
    }

    @GetMapping("/delivery/returns/mine")
    public ResponseEntity<List<Map<String,Object>>> assigned(Authentication auth) {
        return ResponseEntity.ok(returns.assigned(requireRole(auth,"ROLE_DELIVERY")));
    }

    @PostMapping("/delivery/returns/{returnId}/claim")
    public ResponseEntity<Map<String,Object>> claim(@PathVariable String returnId,Authentication auth) {
        return ResponseEntity.ok(returns.claim(returnId,requireRole(auth,"ROLE_DELIVERY")));
    }

    @PostMapping("/delivery/returns/{returnId}/pickup")
    public ResponseEntity<Map<String,Object>> pickup(@PathVariable String returnId,@RequestBody Map<String,String> body,Authentication auth) {
        return ResponseEntity.ok(returns.pickup(returnId,body==null?null:body.get("reference"),requireRole(auth,"ROLE_DELIVERY")));
    }

    @PostMapping("/delivery/returns/{returnId}/handover")
    public ResponseEntity<Map<String,Object>> handover(@PathVariable String returnId,@RequestBody Map<String,String> body,Authentication auth) {
        return ResponseEntity.ok(returns.handover(returnId,body==null?null:body.get("reference"),requireRole(auth,"ROLE_DELIVERY")));
    }

    private SellerEntity currentSeller(String authorization) {
        if(authorization==null||!authorization.startsWith("Bearer ")) throw new ApiException(HttpStatus.UNAUTHORIZED,"Seller session is required");
        return sellers.getCurrentSeller(authorization.substring(7).trim());
    }

    private UserEntity requireRole(Authentication auth,String role) {
        if(auth==null||!(auth.getPrincipal() instanceof UserEntity user))
            throw new ApiException(HttpStatus.UNAUTHORIZED,"An authenticated session is required");
        boolean allowed=auth.getAuthorities()!=null && auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(role::equalsIgnoreCase);
        if(!allowed) throw new ApiException(HttpStatus.FORBIDDEN,"Active "+role.substring(5).toLowerCase()+" session is required");
        return user;
    }
}

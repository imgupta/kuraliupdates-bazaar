package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.order.OrderResponse;
import com.kuraliupdates.bazaar.dto.order.OrderPlacementResponse;
import com.kuraliupdates.bazaar.dto.order.PlaceOrderRequest;
import com.kuraliupdates.bazaar.dto.order.MultiSellerCheckoutRequest;
import com.kuraliupdates.bazaar.dto.product.ProductResponse;
import com.kuraliupdates.bazaar.service.OrderService;
import com.kuraliupdates.bazaar.service.ProductService;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/buyers")
@RequiredArgsConstructor
@Tag(name = "Buyer API", description = "Product search, checkout and order tracking")
public class BuyerController {
    private static final Logger log = LoggerFactory.getLogger(BuyerController.class);
    private final ProductService productService;
    private final OrderService orderService;
    private final AuthService authService;
    private final com.kuraliupdates.bazaar.service.DeliveryConfigurationService deliveryConfigurationService;
    private final com.kuraliupdates.bazaar.service.E2eRunTagging e2eRunTagging;

    @GetMapping("/delivery-estimate")
    @Operation(summary = "Get the configured buyer delivery estimate; null means no ETA promise is configured")
    public ResponseEntity<java.util.Map<String, Object>> getBuyerDeliveryEstimate(Authentication authentication) {
        requireBuyer(authentication);
        return ResponseEntity.ok(java.util.Map.of("estimatedDeliveryMins",
                java.util.Optional.ofNullable(deliveryConfigurationService.estimatedDeliveryMins()).orElse(0)));
    }

    @GetMapping("/products/search")
    @Operation(summary = "Search products across approved Kurali sellers")
    public ResponseEntity<List<ProductResponse>> searchProducts(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return ResponseEntity.ok(productService.search(query, page, size));
    }

    @PostMapping("/orders")
    @Operation(summary = "Place a validated buyer order")
    public ResponseEntity<OrderPlacementResponse> placeOrder(
            @Valid @RequestBody PlaceOrderRequest request,
            @RequestHeader(value = "X-E2E-Run-Id", required = false) String runId,
            @RequestHeader(value = "X-E2E-Flow-Token", required = false) String e2eToken,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationId,
            Authentication authentication) {
        UserEntity user = requireBuyer(authentication);
        String traceId = safeCorrelationId(correlationId);
        String e2eRunId = e2eRunTagging.optionalRunId(runId, e2eToken);
        log.info("Buyer single-seller checkout started correlationId={} itemCount={}",
                traceId, request == null || request.items() == null ? 0 : request.items().size());
        try {
            return ResponseEntity.ok(orderService.placeOrder(request, user, e2eRunId, idempotencyKey));
        } catch (RuntimeException ex) {
            log.warn("Buyer single-seller checkout failed correlationId={} exceptionType={} message={}",
                    traceId, ex.getClass().getSimpleName(), safeMessage(ex.getMessage()));
            throw ex;
        }
    }

    @PostMapping("/orders/checkout")
    @Operation(summary = "Place an atomic multi-seller COD checkout")
    public ResponseEntity<com.kuraliupdates.bazaar.dto.order.MultiSellerOrderPlacementResponse> placeMultiSellerOrder(
            @Valid @RequestBody MultiSellerCheckoutRequest request,
            @RequestHeader(value = "X-E2E-Run-Id", required = false) String runId,
            @RequestHeader(value = "X-E2E-Flow-Token", required = false) String e2eToken,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationId,
            Authentication authentication) {
        UserEntity user = requireBuyer(authentication);
        String traceId = safeCorrelationId(correlationId);
        String e2eRunId = e2eRunTagging.optionalRunId(runId, e2eToken);
        log.info("Buyer multi-seller checkout started correlationId={} itemCount={}",
                traceId, request == null || request.items() == null ? 0 : request.items().size());
        try {
            return ResponseEntity.ok(orderService.placeMultiSellerOrder(request, user, e2eRunId, idempotencyKey));
        } catch (RuntimeException ex) {
            log.warn("Buyer multi-seller checkout failed correlationId={} exceptionType={} message={}",
                    traceId, ex.getClass().getSimpleName(), safeMessage(ex.getMessage()));
            throw ex;
        }
    }

    @PostMapping("/orders/{orderId}/cancel")
    @Operation(summary = "Cancel an eligible buyer order and restore checkout inventory atomically")
    public ResponseEntity<OrderResponse> cancelOrder(
            @PathVariable String orderId,
            Authentication authentication) {
        UserEntity user = requireBuyer(authentication);
        return ResponseEntity.ok(orderService.cancelOrderForBuyer(orderId, user));
    }

    @PostMapping("/orders/{orderId}/confirm-pickup")
    @Operation(summary = "Confirm store pickup using the buyer's one-time pickup OTP")
    public ResponseEntity<OrderResponse> confirmStorePickup(
            @PathVariable String orderId,
            @RequestBody java.util.Map<String, String> payload,
            Authentication authentication) {
        UserEntity user = requireBuyer(authentication);
        return ResponseEntity.ok(orderService.confirmStorePickup(orderId,
                payload == null ? null : payload.get("otp"), user));
    }

    @GetMapping("/me/orders")
    @Operation(summary = "Get order history for the authenticated buyer")
    public ResponseEntity<List<OrderResponse>> myOrders(Authentication authentication) {
        UserEntity user = requireBuyer(authentication);
        return ResponseEntity.ok(orderService.history(user));
    }

    @GetMapping("/orders/{orderId}/track")
    @Operation(summary = "Get current order tracking state for the authenticated owning buyer")
    public ResponseEntity<OrderResponse> trackOrder(@PathVariable String orderId, Authentication authentication) {
        UserEntity user = requireBuyer(authentication);
        return ResponseEntity.ok(orderService.trackForBuyer(orderId, user));
    }

    private String safeCorrelationId(String value) {
        return value != null && value.matches("[A-Za-z0-9._:-]{8,100}") ? value : "not-provided";
    }

    private String safeMessage(String value) {
        if (value == null) return "";
        return value.replaceAll("[\\r\\n\\t]", " ").substring(0, Math.min(value.length(), 240));
    }

    private UserEntity requireBuyer(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity user)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authenticated buyer session is required");
        }
        // A user may own multiple marketplace profiles (or be an admin) while
        // the current session is explicitly scoped to BUYER. Authorization must
        // follow the role bound to this session, never the account's primary role.
        boolean buyerSession = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> "ROLE_BUYER".equalsIgnoreCase(authority));
        if (!buyerSession) {
            throw new ApiException(HttpStatus.FORBIDDEN, "The active session is not authorized for buyer order actions");
        }
        return user;
    }
}

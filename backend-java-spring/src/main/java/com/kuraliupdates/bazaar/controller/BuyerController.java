package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.order.OrderResponse;
import com.kuraliupdates.bazaar.dto.order.OrderPlacementResponse;
import com.kuraliupdates.bazaar.dto.order.PlaceOrderRequest;
import com.kuraliupdates.bazaar.dto.product.ProductResponse;
import com.kuraliupdates.bazaar.service.OrderService;
import com.kuraliupdates.bazaar.service.ProductService;
import com.kuraliupdates.bazaar.service.AuthService;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/buyers")
@RequiredArgsConstructor
@Tag(name = "Buyer API", description = "Product search, checkout and order tracking")
public class BuyerController {
    private final ProductService productService;
    private final OrderService orderService;
    private final AuthService authService;

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
    public ResponseEntity<OrderPlacementResponse> placeOrder(@Valid @RequestBody PlaceOrderRequest request, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity user)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authenticated buyer session is required");
        }
        return ResponseEntity.ok(orderService.placeOrder(request, user));
    }

    @GetMapping("/me/orders")
    @Operation(summary = "Get order history for the authenticated buyer")
    public ResponseEntity<List<OrderResponse>> myOrders(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity user)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authenticated buyer session is required");
        }
        return ResponseEntity.ok(orderService.history(user.getEmail()));
    }

    @GetMapping("/orders/{orderId}/track")
    @Operation(summary = "Get current order tracking state for the authenticated owning buyer")
    public ResponseEntity<OrderResponse> trackOrder(@PathVariable String orderId, Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity user)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authenticated buyer session is required");
        }
        return ResponseEntity.ok(orderService.trackForBuyer(orderId, user));
    }
}

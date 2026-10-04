package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.dto.order.OrderResponse;
import com.kuraliupdates.bazaar.dto.order.OrderPlacementResponse;
import com.kuraliupdates.bazaar.dto.order.PlaceOrderRequest;
import com.kuraliupdates.bazaar.dto.product.ProductResponse;
import com.kuraliupdates.bazaar.service.OrderService;
import com.kuraliupdates.bazaar.service.ProductService;
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

    @GetMapping("/products/search")
    @Operation(summary = "Search products across approved Kurali sellers")
    public ResponseEntity<List<ProductResponse>> searchProducts(@RequestParam(defaultValue = "") String query) {
        return ResponseEntity.ok(productService.search(query));
    }

    @PostMapping("/orders")
    @Operation(summary = "Place a validated buyer order")
    public ResponseEntity<OrderPlacementResponse> placeOrder(@Valid @RequestBody PlaceOrderRequest request) {
        return ResponseEntity.ok(orderService.placeOrder(request));
    }

    @GetMapping("/orders/{orderId}/track")
    @Operation(summary = "Get current order tracking state")
    public ResponseEntity<OrderResponse> trackOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(orderService.track(orderId));
    }
}

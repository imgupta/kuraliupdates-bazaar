package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.order.OrderPlacementResponse;
import com.kuraliupdates.bazaar.dto.order.OrderResponse;
import com.kuraliupdates.bazaar.dto.order.PlaceOrderRequest;
import com.kuraliupdates.bazaar.dto.order.OrderItemRequest;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.OrderItemEntity;
import com.kuraliupdates.bazaar.entity.ProductEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final SellerRepository sellerRepository;
    private final ProductRepository productRepository;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public OrderPlacementResponse placeOrder(PlaceOrderRequest request) {
        if (!"COD".equalsIgnoreCase(request.paymentMethod())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Online payment is not enabled yet. Please select Cash on Delivery.");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one order item is required");
        }

        Map<String, Integer> quantities = new TreeMap<>();
        for (OrderItemRequest item : request.items()) {
            if (item.quantity() == null || item.quantity() <= 0 || item.productId() == null || item.productId().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each order item needs a product and positive quantity");
            }
            quantities.merge(item.productId().trim(), item.quantity(), Math::addExact);
        }

        List<ProductEntity> products = new ArrayList<>();
        String sellerId = null;
        BigDecimal itemSubtotal = BigDecimal.ZERO;
        List<OrderItemEntity> orderItems = new ArrayList<>();

        // Lock product rows in deterministic ID order to prevent overselling and reduce deadlock risk.
        for (Map.Entry<String, Integer> entry : quantities.entrySet()) {
            ProductEntity product = productRepository.findLockedByProductId(entry.getKey())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found: " + entry.getKey()));
            SellerEntity productSeller = product.getSeller();
            if (productSeller == null || !"APPROVED".equalsIgnoreCase(productSeller.getStatus())) {
                throw new ApiException(HttpStatus.CONFLICT, "Product seller is not approved");
            }
            if (sellerId == null) sellerId = productSeller.getSellerId();
            if (!sellerId.equals(productSeller.getSellerId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "A single order can contain products from one seller only");
            }
            int available = product.getStock() == null ? 0 : product.getStock();
            if (available < entry.getValue()) {
                throw new ApiException(HttpStatus.CONFLICT, "Insufficient stock for product " + product.getTitle());
            }
            BigDecimal unitPrice = product.getEffectivePrice();
            if (unitPrice == null) {
                BigDecimal pct = product.getAdditionalDiscountPercent() == null
                        ? BigDecimal.ZERO : product.getAdditionalDiscountPercent();
                unitPrice = product.getSellerPrice().multiply(BigDecimal.ONE.subtract(
                        pct.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP)))
                        .setScale(2, RoundingMode.HALF_UP);
            }
            if (unitPrice == null || unitPrice.signum() <= 0) {
                throw new ApiException(HttpStatus.CONFLICT, "Product has an invalid selling price");
            }
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(entry.getValue())).setScale(2, RoundingMode.HALF_UP);
            itemSubtotal = itemSubtotal.add(lineTotal);
            orderItems.add(OrderItemEntity.builder()
                    .itemId("ITEM-" + UUID.randomUUID().toString().substring(0, 12))
                    .product(product)
                    .quantity(entry.getValue())
                    .unitPrice(unitPrice)
                    .totalPrice(lineTotal)
                    .build());
            products.add(product);
        }

        SellerEntity seller = sellerRepository.findById(sellerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Seller not found"));
        BigDecimal freeDeliveryThreshold = seller.getMinOrderForFreeDelivery() == null
                ? BigDecimal.valueOf(499) : seller.getMinOrderForFreeDelivery();
        BigDecimal deliveryFee = itemSubtotal.compareTo(freeDeliveryThreshold) >= 0
                ? BigDecimal.ZERO
                : (seller.getBaseDeliveryFee() == null ? BigDecimal.valueOf(35) : seller.getBaseDeliveryFee());
        BigDecimal total = itemSubtotal.add(deliveryFee).setScale(2, RoundingMode.HALF_UP);

        LocalDateTime now = LocalDateTime.now();
        OrderEntity order = OrderEntity.builder()
                .orderId("ORD-KUR-" + UUID.randomUUID().toString().substring(0, 8))
                .buyerName(request.buyerName().trim())
                .buyerPhone(request.buyerPhone().trim())
                .buyerEmail(request.buyerEmail() == null ? null : request.buyerEmail().trim().toLowerCase())
                .deliveryAddress(request.deliveryAddress().trim())
                .deliveryLocality(request.deliveryLocality().trim())
                .deliveryLatitude(request.deliveryLatitude() == null ? null : BigDecimal.valueOf(request.deliveryLatitude()))
                .deliveryLongitude(request.deliveryLongitude() == null ? null : BigDecimal.valueOf(request.deliveryLongitude()))
                .deliveryPlaceId(trim(request.deliveryPlaceId()))
                .seller(seller)
                .subtotal(itemSubtotal)
                .billDiscountAmount(BigDecimal.ZERO)
                .couponDiscountAmount(BigDecimal.ZERO)
                .deliveryFee(deliveryFee)
                .isFreeDelivery(deliveryFee.signum() == 0 ? 1 : 0)
                .totalAmount(total)
                .paymentMethod(request.paymentMethod().trim())
                .paymentStatus("PENDING_COD")
                .status("PLACED")
                .deliveryOtp(String.format("%04d", random.nextInt(10000)))
                .distanceKm(request.distanceKm() == null ? BigDecimal.valueOf(1.5) : request.distanceKm())
                .estimatedDeliveryMins(25)
                .placedAt(now)
                .updatedAt(now)
                .items(orderItems)
                .build();

        // Reserve stock in the same transaction as order + item persistence.
        for (int i = 0; i < products.size(); i++) {
            ProductEntity product = products.get(i);
            int quantity = quantities.get(product.getProductId());
            product.setStock(product.getStock() - quantity);
        }
        orderItems.forEach(item -> item.setOrder(order));
        OrderEntity saved = orderRepository.save(order);
        return new OrderPlacementResponse(OrderResponse.from(saved), saved.getDeliveryOtp());
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> history(String buyerEmail) {
        if (buyerEmail == null || buyerEmail.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authenticated buyer session is required");
        }
        return orderRepository.findByBuyerEmail(buyerEmail.trim().toLowerCase())
                .stream().map(OrderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse track(String orderId) {
        return orderRepository.findById(orderId)
                .map(OrderResponse::from)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}

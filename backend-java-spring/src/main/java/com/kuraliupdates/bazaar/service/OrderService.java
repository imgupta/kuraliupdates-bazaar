package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.order.OrderResponse;\nimport com.kuraliupdates.bazaar.dto.order.OrderPlacementResponse;
import com.kuraliupdates.bazaar.dto.order.PlaceOrderRequest;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final SellerRepository sellerRepository;
    private final SecureRandom random = new SecureRandom();

    @Transactional
    public OrderPlacementResponse placeOrder(PlaceOrderRequest request) {
        SellerEntity seller = sellerRepository.findById(request.sellerId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Seller not found"));

        LocalDateTime now = LocalDateTime.now();
        BigDecimal discount = request.discountAmount() == null ? BigDecimal.ZERO : request.discountAmount();
        BigDecimal deliveryFee = request.deliveryFee() == null ? BigDecimal.ZERO : request.deliveryFee();

        OrderEntity order = OrderEntity.builder()
                .orderId("ORD-KUR-" + UUID.randomUUID().toString().substring(0, 8))
                .buyerName(request.buyerName().trim())
                .buyerPhone(request.buyerPhone().trim())
                .buyerEmail(request.buyerEmail() == null ? null : request.buyerEmail().trim().toLowerCase())
                .deliveryAddress(request.deliveryAddress().trim())
                .deliveryLocality(request.deliveryLocality().trim())
                .deliveryLatitude(BigDecimal.valueOf(request.deliveryLatitude()))
                .deliveryLongitude(BigDecimal.valueOf(request.deliveryLongitude()))
                .deliveryPlaceId(trim(request.deliveryPlaceId()))
                .seller(seller)
                .subtotal(request.subtotal())
                .billDiscountAmount(discount)
                .couponDiscountAmount(BigDecimal.ZERO)
                .deliveryFee(deliveryFee)
                .isFreeDelivery(deliveryFee.signum() == 0 ? 1 : 0)
                .totalAmount(request.finalPayable())
                .paymentMethod(request.paymentMethod().trim())
                .paymentStatus("COD".equalsIgnoreCase(request.paymentMethod()) ? "PENDING_COD" : "PAID")
                .status("PLACED")
                .deliveryOtp(String.format("%04d", random.nextInt(10000)))
                .distanceKm(request.distanceKm() == null ? BigDecimal.valueOf(1.5) : request.distanceKm())
                .estimatedDeliveryMins(25)
                .placedAt(now)
                .updatedAt(now)
                .build();

        OrderEntity saved = orderRepository.save(order);\n        return new OrderPlacementResponse(OrderResponse.from(saved), saved.getDeliveryOtp());
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

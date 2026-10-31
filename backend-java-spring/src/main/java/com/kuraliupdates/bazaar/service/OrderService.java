package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.order.OrderPlacementResponse;
import com.kuraliupdates.bazaar.dto.order.OrderResponse;
import com.kuraliupdates.bazaar.dto.order.PlaceOrderRequest;
import com.kuraliupdates.bazaar.dto.order.MultiSellerCheckoutRequest;
import com.kuraliupdates.bazaar.dto.order.OrderItemRequest;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.OrderItemEntity;
import com.kuraliupdates.bazaar.entity.ProductEntity;
import com.kuraliupdates.bazaar.entity.SellerEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.OrderRepository;
import com.kuraliupdates.bazaar.repository.ProductRepository;
import com.kuraliupdates.bazaar.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final JdbcTemplate jdbc;
    private final SecureRandom random = new SecureRandom();

    /** Creates seller-owned suborders under one transaction; any seller failure rolls back the entire checkout. */
    @Transactional
    public com.kuraliupdates.bazaar.dto.order.MultiSellerOrderPlacementResponse placeMultiSellerOrder(
            MultiSellerCheckoutRequest request, UserEntity buyer, String e2eRunId) {
        if (!"COD".equalsIgnoreCase(request.paymentMethod())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Online payment is not enabled yet. Please select Cash on Delivery.");
        }
        String fulfilmentMode = request.fulfilmentMode() == null ? "DELIVERY" : request.fulfilmentMode().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("DELIVERY", "STORE_PICKUP").contains(fulfilmentMode)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Fulfilment mode must be DELIVERY or STORE_PICKUP");
        }
        if ("STORE_PICKUP".equals(fulfilmentMode)) {
            Integer pickupEnabled = jdbc.queryForObject("SELECT STORE_PICKUP_ENABLED FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID=1", Integer.class);
            if (!Integer.valueOf(1).equals(pickupEnabled)) {
                throw new ApiException(HttpStatus.CONFLICT, "Store pickup is currently disabled");
            }
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one order item is required");
        }
        Map<String, List<OrderItemRequest>> bySeller = new TreeMap<>();
        for (OrderItemRequest item : request.items()) {
            if (item.productId() == null || item.productId().isBlank() || item.quantity() == null || item.quantity() <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each order item needs a product and positive quantity");
            }
            ProductEntity product = productRepository.findLockedByProductId(item.productId().trim())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found: " + item.productId()));
            if (product.getSeller() == null || !"APPROVED".equalsIgnoreCase(product.getSeller().getStatus())) {
                throw new ApiException(HttpStatus.CONFLICT, "Product seller is not approved");
            }
            bySeller.computeIfAbsent(product.getSeller().getSellerId(), ignored -> new ArrayList<>()).add(item);
        }
        Integer configuredMax = jdbc.queryForObject("SELECT MAX_SELLERS_PER_BATCH FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID=1", Integer.class);
        int maxSellers = configuredMax == null ? 3 : Math.min(configuredMax, 10);
        if (bySeller.size() > maxSellers) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A checkout can contain products from at most " + maxSellers + " stores");
        }
        String checkoutGroupId = "CHK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase(Locale.ROOT);
        List<OrderPlacementResponse> placed = new ArrayList<>();
        for (Map.Entry<String, List<OrderItemRequest>> group : bySeller.entrySet()) {
            PlaceOrderRequest sellerRequest = new PlaceOrderRequest(
                    buyer.getName(), buyer.getPhone(), buyer.getEmail(), request.deliveryAddress(),
                    request.deliveryLocality(), group.getKey(), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    BigDecimal.ZERO, request.paymentMethod(), request.distanceKm(), request.deliveryLatitude(),
                    request.deliveryLongitude(), request.deliveryPlaceId(), group.getValue());
            OrderPlacementResponse result = placeOrder(sellerRequest, buyer, e2eRunId);
            OrderEntity saved = orderRepository.findById(result.order().orderId())
                    .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Created seller order could not be reloaded"));
            saved.setCheckoutGroupId(checkoutGroupId);
            saved.setFulfilmentStatus("AWAITING_SELLER_ACCEPTANCE");
            saved.setFulfilmentMode(fulfilmentMode);
            if ("STORE_PICKUP".equals(fulfilmentMode)) {
                saved.setDeliveryFee(BigDecimal.ZERO);
                saved.setIsFreeDelivery(1);
                saved.setTotalAmount(saved.getSubtotal().subtract(
                        saved.getBillDiscountAmount() == null ? BigDecimal.ZERO : saved.getBillDiscountAmount())
                        .subtract(saved.getCouponDiscountAmount() == null ? BigDecimal.ZERO : saved.getCouponDiscountAmount())
                        .setScale(2, RoundingMode.HALF_UP));
                saved.setDistanceKm(BigDecimal.ZERO);
                saved.setRiderPayoutSnapshot(BigDecimal.ZERO);
                saved.setRiderPayoutSnapshottedAt(LocalDateTime.now());
            } else {
                saved.setRiderPayoutSnapshot(null);
                saved.setRiderPayoutSnapshottedAt(null);
            }
            orderRepository.save(saved);
            placed.add(result);
        }
        return new com.kuraliupdates.bazaar.dto.order.MultiSellerOrderPlacementResponse(checkoutGroupId, List.copyOf(placed));
    }

    @Transactional
    public OrderPlacementResponse placeOrder(PlaceOrderRequest request, UserEntity buyer) {
        return placeOrder(request, buyer, null);
    }

    @Transactional
    public OrderPlacementResponse placeOrder(PlaceOrderRequest request, UserEntity buyer, String e2eRunId) {
        if (!"COD".equalsIgnoreCase(request.paymentMethod())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Online payment is not enabled yet. Please select Cash on Delivery.");
        }
        if (request.items() == null || request.items().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one order item is required");
        }

        Map<String, Integer> quantities = new TreeMap<>();
        Map<String, String> acceptedOffers = new HashMap<>();
        Map<String, BigDecimal> clientNegotiatedPrices = new HashMap<>();
        for (OrderItemRequest item : request.items()) {
            if (item.quantity() == null || item.quantity() <= 0 || item.productId() == null || item.productId().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Each order item needs a product and positive quantity");
            }
            String productId = item.productId().trim();
            quantities.merge(productId, item.quantity(), Math::addExact);
            if (item.acceptedOfferId() != null && !item.acceptedOfferId().isBlank()) {
                String previous = acceptedOffers.putIfAbsent(productId, item.acceptedOfferId().trim());
                if (previous != null && !previous.equals(item.acceptedOfferId().trim())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "A cart item cannot use multiple accepted bargain offers");
                }
            }
            if (item.negotiatedPrice() != null) clientNegotiatedPrices.put(productId, item.negotiatedPrice());
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
            if (Boolean.FALSE.equals(productSeller.getStoreOpen())) {
                throw new ApiException(HttpStatus.CONFLICT, "This store is currently closed and is not accepting new orders");
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
            String acceptedOfferId = acceptedOffers.get(entry.getKey());
            BigDecimal negotiatedPrice = null;
            if (acceptedOfferId != null) {
                negotiatedPrice = jdbc.query(
                        "SELECT m.OFFER_PRICE FROM CHAT_MESSAGES m JOIN NEGOTIATION_CHATS c ON c.CHAT_ID=m.CHAT_ID WHERE m.MESSAGE_ID=? AND m.OFFER_STATUS='ACCEPTED' AND c.PRODUCT_ID=? AND c.SELLER_ID=? AND LOWER(c.BUYER_EMAIL)=? AND c.CURRENT_AGREED_PRICE=m.OFFER_PRICE",
                        rs -> rs.next() ? rs.getBigDecimal(1) : null,
                        acceptedOfferId, product.getProductId(), productSeller.getSellerId(),
                        buyer.getEmail() == null ? "" : buyer.getEmail().trim().toLowerCase(Locale.ROOT));
                if (negotiatedPrice == null || (clientNegotiatedPrices.containsKey(entry.getKey())
                        && clientNegotiatedPrices.get(entry.getKey()).compareTo(negotiatedPrice) != 0)) {
                    throw new ApiException(HttpStatus.CONFLICT, "The negotiated price is no longer valid. Reopen the chat and add the accepted offer to your cart again.");
                }
            } else if (clientNegotiatedPrices.containsKey(entry.getKey())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Negotiated cart price must reference a seller-accepted offer. Reopen bargaining chat and add the accepted offer again.");
            }
            if (negotiatedPrice != null) unitPrice = negotiatedPrice;
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
                    .negotiatedPrice(negotiatedPrice)
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
                .buyerName(buyer.getName())
                .buyerPhone(buyer.getPhone())
                .buyerEmail(buyer.getEmail() == null ? null : buyer.getEmail().trim().toLowerCase())
                .deliveryAddress(request.deliveryAddress().trim())
                .deliveryLocality(request.deliveryLocality().trim())
                .deliveryLatitude(request.deliveryLatitude() == null ? null : BigDecimal.valueOf(request.deliveryLatitude()))
                .deliveryLongitude(request.deliveryLongitude() == null ? null : BigDecimal.valueOf(request.deliveryLongitude()))
                .deliveryPlaceId(trim(request.deliveryPlaceId()))
                .seller(seller)
                .fulfilmentMode("DELIVERY")
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
                .distanceKm(request.distanceKm())
                .estimatedDeliveryMins(25)
                .e2eRunId(e2eRunId)
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

    @Transactional
    public OrderResponse confirmStorePickup(String orderId, String otp, UserEntity buyer) {
        if (buyer == null || !"BUYER".equalsIgnoreCase(buyer.getRole()) || buyer.getEmail() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the owning buyer can confirm store pickup");
        }
        if (otp == null || !otp.matches("\\d{4}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Pickup OTP must be 4 digits");
        }
        OrderEntity order = orderRepository.findLockedByOrderId(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        if (order.getBuyerEmail() == null || !order.getBuyerEmail().equalsIgnoreCase(buyer.getEmail().trim())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Order not found");
        }
        if (!"STORE_PICKUP".equalsIgnoreCase(order.getFulfilmentMode())) {
            throw new ApiException(HttpStatus.CONFLICT, "This order is not configured for store pickup");
        }
        if (!"READY_FOR_PICKUP".equals(order.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "The seller has not marked this order ready for pickup");
        }
        if (!otp.equals(order.getDeliveryOtp())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid pickup OTP");
        }
        order.setStatus("DELIVERED");
        order.setFulfilmentStatus("PICKED_UP_BY_BUYER");
        order.setPaymentStatus("PAID");
        order.setUpdatedAt(LocalDateTime.now());
        return OrderResponse.from(orderRepository.save(order));
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
    public OrderResponse trackForBuyer(String orderId, UserEntity buyer) {
        if (buyer == null || !"BUYER".equalsIgnoreCase(buyer.getRole())
                || buyer.getEmail() == null || buyer.getEmail().isBlank()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the owning buyer can track this order");
        }
        OrderEntity order = orderRepository.findById(orderId)
                .filter(candidate -> candidate.getBuyerEmail() != null
                        && candidate.getBuyerEmail().equalsIgnoreCase(buyer.getEmail().trim()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        return OrderResponse.from(order);
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}

package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.dto.product.ProductResponse;
import com.kuraliupdates.bazaar.dto.seller.SellerProductRequest;
import com.kuraliupdates.bazaar.dto.seller.SellerDiscountRequest;
import com.kuraliupdates.bazaar.entity.BillDiscountEntity;
import com.kuraliupdates.bazaar.repository.BillDiscountRepository;
import com.kuraliupdates.bazaar.entity.OrderEntity;
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
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SellerService {
    private final AuthService authService;
    private final SellerRepository sellerRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final BillDiscountRepository billDiscountRepository;

    @Transactional(readOnly = true)
    public SellerEntity getCurrentSeller(String token) {
        return sellerRepository.findByEmail(authService.requireUser(token).getEmail())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Seller store profile not found"));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getProducts(String token) {
        SellerEntity seller = getCurrentSeller(token);
        return productRepository.findBySeller_SellerId(seller.getSellerId()).stream()
                .map(ProductResponse::from).toList();
    }

    @Transactional
    public ProductResponse addProduct(String token, SellerProductRequest request) {
        SellerEntity seller = requireApprovedSeller(token);
        validatePrice(request);
        LocalDateTime now = LocalDateTime.now();
        ProductEntity product = ProductEntity.builder()
                .productId("prod-" + UUID.randomUUID().toString().substring(0, 8))
                .seller(seller)
                .title(request.title().trim())
                .category(request.category().trim())
                .description(trim(request.description()))
                .imageUrl(trim(request.imageUrl()))
                .mrp(request.mrp())
                .sellerPrice(request.sellerPrice())
                .additionalDiscountPercent(defaultDiscount(request.additionalDiscountPercent()))
                .stock(request.stock() == null ? 0 : request.stock())
                .unit(blankOr(request.unit(), "1 pc"))
                .tags(request.tags() == null ? null : String.join(",", request.tags()))
                .isFeatured(Boolean.TRUE.equals(request.isFeatured()) ? 1 : 0)
                .createdAt(now)
                .updatedAt(now)
                .build();
        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public ProductResponse updateProduct(String token, String productId, SellerProductRequest request) {
        SellerEntity seller = requireApprovedSeller(token);
        validatePrice(request);
        ProductEntity product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        ensureOwnership(product, seller);
        product.setTitle(request.title().trim());
        product.setCategory(request.category().trim());
        product.setDescription(trim(request.description()));
        product.setImageUrl(trim(request.imageUrl()));
        product.setMrp(request.mrp());
        product.setSellerPrice(request.sellerPrice());
        product.setAdditionalDiscountPercent(defaultDiscount(request.additionalDiscountPercent()));
        product.setStock(request.stock() == null ? 0 : request.stock());
        product.setUnit(blankOr(request.unit(), "1 pc"));
        product.setTags(request.tags() == null ? null : String.join(",", request.tags()));
        product.setIsFeatured(Boolean.TRUE.equals(request.isFeatured()) ? 1 : 0);
        product.setUpdatedAt(LocalDateTime.now());
        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(String token, String productId) {
        SellerEntity seller = requireApprovedSeller(token);
        ProductEntity product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        ensureOwnership(product, seller);
        productRepository.delete(product);
    }

    @Transactional(readOnly = true)
    public List<OrderEntity> getOrders(String token) {
        SellerEntity seller = getCurrentSeller(token);
        return orderRepository.findBySeller_SellerId(seller.getSellerId());
    }

    @Transactional
    public OrderEntity updateOrderStatus(String token, String orderId, String requestedStatus) {
        SellerEntity seller = requireApprovedSeller(token);
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        if (order.getSeller() == null || !seller.getSellerId().equals(order.getSeller().getSellerId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This order does not belong to your store");
        }

        String current = upper(order.getStatus());
        String next = upper(requestedStatus);
        if ("PLACED".equals(current) && !"ACCEPTED_BY_SELLER".equals(next) && !"CANCELLED".equals(next)) {
            throw new ApiException(HttpStatus.CONFLICT, "Order must be accepted before it can be prepared");
        }
        if ("ACCEPTED_BY_SELLER".equals(current) && !"READY_FOR_PICKUP".equals(next) && !"CANCELLED".equals(next)) {
            throw new ApiException(HttpStatus.CONFLICT, "Only ready-for-pickup or cancellation is allowed next");
        }
        if (!List.of("ACCEPTED_BY_SELLER", "READY_FOR_PICKUP", "CANCELLED").contains(next)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported seller order status");
        }

        order.setStatus(next);
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    @Transactional(readOnly = true)
    public List<BillDiscountEntity> getDiscounts(String token) {
        SellerEntity seller = getCurrentSeller(token);
        return billDiscountRepository.findBySeller_SellerIdOrderByMinBillAmountAsc(seller.getSellerId());
    }

    @Transactional
    public BillDiscountEntity addDiscount(String token, SellerDiscountRequest request) {
        SellerEntity seller = requireApprovedSeller(token);
        if ((request.discountPercentage() == null) == (request.flatDiscount() == null)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Provide either percentage or flat discount");
        }
        if (request.discountPercentage() != null && request.discountPercentage().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Discount percentage cannot exceed 100%");
        }
        return billDiscountRepository.save(BillDiscountEntity.builder()
                .ruleId("disc-" + UUID.randomUUID().toString().substring(0, 8))
                .seller(seller).minBillAmount(request.minBillAmount())
                .discountPercentage(request.discountPercentage()).flatDiscount(request.flatDiscount())
                .description(request.description().trim()).createdAt(LocalDateTime.now()).build());
    }

    @Transactional
    public void deleteDiscount(String token, String ruleId) {
        SellerEntity seller = requireApprovedSeller(token);
        BillDiscountEntity rule = billDiscountRepository.findById(ruleId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Discount rule not found"));
        if (rule.getSeller() == null || !seller.getSellerId().equals(rule.getSeller().getSellerId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This discount does not belong to your store");
        }
        billDiscountRepository.delete(rule);
    }

    private SellerEntity requireApprovedSeller(String token) {
        SellerEntity seller = getCurrentSeller(token);
        if (!"APPROVED".equalsIgnoreCase(seller.getStatus())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Your store is not approved yet. Current status: " + seller.getStatus());
        }
        return seller;
    }

    private void ensureOwnership(ProductEntity product, SellerEntity seller) {
        if (product.getSeller() == null || !seller.getSellerId().equals(product.getSeller().getSellerId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This product does not belong to your store");
        }
    }

    private void validatePrice(SellerProductRequest request) {
        if (request.sellerPrice().compareTo(request.mrp()) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Seller price cannot be higher than MRP");
        }
        BigDecimal discount = defaultDiscount(request.additionalDiscountPercent());
        if (discount.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Additional discount cannot exceed 100%");
        }
    }

    private BigDecimal defaultDiscount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String blankOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String upper(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }
}
package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.entity.UserEntity;
import com.kuraliupdates.bazaar.service.SellerServiceAreaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequiredArgsConstructor
@RequestMapping("/seller-service-area")
public class SellerServiceAreaController {
    private final SellerServiceAreaService service;

    @GetMapping
    public SellerServiceAreaService.ServiceAreaView getConfiguration() {
        return service.getConfiguration();
    }

    @PutMapping
    public SellerServiceAreaService.ServiceAreaView updateConfiguration(
            @RequestBody UpdateServiceAreaRequest request, Authentication authentication) {
        if (authentication == null || authentication.getAuthorities().stream()
                .noneMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Administrator access required");
        }
        String actor = authentication.getPrincipal() instanceof UserEntity user ? user.getUserId() : "ADMIN";
        return service.updateConfiguration(request.centerLatitude(), request.centerLongitude(),
                request.radiusKm(), request.enabled(), actor);
    }

    public record UpdateServiceAreaRequest(BigDecimal centerLatitude, BigDecimal centerLongitude,
                                          BigDecimal radiusKm, boolean enabled) {}
}

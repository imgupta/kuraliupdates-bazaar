package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.SellerServiceAreaConfigEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.SellerServiceAreaConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SellerServiceAreaService {
    private static final String CONFIG_KEY = "SELLER_REGISTRATION";
    private static final double EARTH_RADIUS_KM = 6371.0088d;

    private final SellerServiceAreaConfigRepository repository;

    @Transactional(readOnly = true)
    public ServiceAreaView getConfiguration() {
        SellerServiceAreaConfigEntity config = repository.findById(CONFIG_KEY)
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Seller registration service area is not configured"));
        return view(config);
    }

    @Transactional
    public ServiceAreaView updateConfiguration(BigDecimal latitude, BigDecimal longitude,
                                                BigDecimal radiusKm, boolean enabled, String actor) {
        validateCoordinates(latitude, longitude);
        if (radiusKm == null || radiusKm.compareTo(BigDecimal.ZERO) <= 0
                || radiusKm.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Seller registration radius must be greater than 0 and no more than 100 km");
        }

        SellerServiceAreaConfigEntity current = repository.findById(CONFIG_KEY)
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Seller registration service area is not configured"));
        current.setCenterLatitude(latitude.setScale(7, RoundingMode.HALF_UP));
        current.setCenterLongitude(longitude.setScale(7, RoundingMode.HALF_UP));
        current.setRadiusKm(radiusKm.setScale(2, RoundingMode.HALF_UP));
        current.setEnabled(enabled ? 1 : 0);
        current.setConfigVersion(current.getConfigVersion() + 1);
        current.setUpdatedBy(actor == null || actor.isBlank() ? "ADMIN" : actor.substring(0, Math.min(64, actor.length())));
        current.setUpdatedAt(LocalDateTime.now());
        return view(repository.save(current));
    }

    @Transactional(readOnly = true)
    public LocationEligibility validateSellerLocation(Double latitude, Double longitude) {
        if (latitude == null || longitude == null || !Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
                || (latitude == 0d && longitude == 0d)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A valid shop map location is required");
        }
        SellerServiceAreaConfigEntity config = repository.findById(CONFIG_KEY)
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Seller registration service area is not configured"));
        if (!Integer.valueOf(1).equals(config.getEnabled())) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Seller registration is temporarily unavailable");
        }
        double distance = haversineKm(latitude, longitude,
                config.getCenterLatitude().doubleValue(), config.getCenterLongitude().doubleValue());
        double radius = config.getRadiusKm().doubleValue();
        if (distance > radius) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    String.format(java.util.Locale.ROOT,
                            "This shop is outside the Kurali seller registration area (%.2f km away; maximum %.2f km)",
                            distance, radius));
        }
        return new LocationEligibility(distance, radius, config.getConfigVersion());
    }

    private void validateCoordinates(BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null
                || latitude.compareTo(BigDecimal.valueOf(-90)) < 0 || latitude.compareTo(BigDecimal.valueOf(90)) > 0
                || longitude.compareTo(BigDecimal.valueOf(-180)) < 0 || longitude.compareTo(BigDecimal.valueOf(180)) > 0
                || (latitude.compareTo(BigDecimal.ZERO) == 0 && longitude.compareTo(BigDecimal.ZERO) == 0)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Valid centre latitude and longitude are required");
        }
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private ServiceAreaView view(SellerServiceAreaConfigEntity config) {
        return new ServiceAreaView(config.getCenterLatitude(), config.getCenterLongitude(),
                config.getRadiusKm(), Integer.valueOf(1).equals(config.getEnabled()),
                config.getConfigVersion(), config.getUpdatedAt());
    }

    public record ServiceAreaView(BigDecimal centerLatitude, BigDecimal centerLongitude,
                                  BigDecimal radiusKm, boolean enabled, Integer version,
                                  LocalDateTime updatedAt) {}
    public record LocationEligibility(double distanceKm, double radiusKm, Integer configVersion) {}
}

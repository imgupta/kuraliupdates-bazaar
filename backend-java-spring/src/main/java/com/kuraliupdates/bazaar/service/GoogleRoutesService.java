package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Road distance adapter. Returns empty when Maps is not configured or any pickup location is unverified. */
@Service
public class GoogleRoutesService {
    private final RestClient client = RestClient.builder()
            .baseUrl("https://routes.googleapis.com")
            .build();

    @Value("${google.maps.routes.api-key:}")
    private String apiKey;

    public BigDecimal calculateCombinedRouteKm(List<OrderEntity> orders) {
        if (apiKey == null || apiKey.isBlank() || orders == null || orders.isEmpty()) return null;
        OrderEntity first = orders.get(0);
        if (first.getDeliveryLatitude() == null || first.getDeliveryLongitude() == null) return null;

        List<Map<String, Object>> pickups = new ArrayList<>();
        for (OrderEntity order : orders) {
            if (order.getSeller() == null
                    || !Boolean.TRUE.equals(order.getSeller().getLocationVerified())
                    || order.getSeller().getLatitude() == null
                    || order.getSeller().getLongitude() == null) return null;
            Map<String, Object> waypoint = new LinkedHashMap<>();
            waypoint.put("location", Map.of("latLng", Map.of(
                    "latitude", order.getSeller().getLatitude(),
                    "longitude", order.getSeller().getLongitude())));
            pickups.add(waypoint);
        }

        Map<String, Object> origin = waypoint(orders.get(0).getSeller().getLatitude(),
                orders.get(0).getSeller().getLongitude());
        Map<String, Object> destination = waypoint(first.getDeliveryLatitude(), first.getDeliveryLongitude());
        List<Map<String, Object>> intermediates = new ArrayList<>(pickups.subList(1, pickups.size()));
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("origin", origin);
        request.put("destination", destination);
        request.put("intermediates", intermediates);
        request.put("travelMode", "DRIVE");
        request.put("optimizeWaypointOrder", true);
        Map<?, ?> response;
        try {
            response = client.post().uri("/directions/v2:computeRoutes")
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask", "routes.distanceMeters")
                    .body(request).retrieve().body(Map.class);
        } catch (Exception ex) {
            return null;
        }
        if (response == null || !(response.get("routes") instanceof List<?> routes) || routes.isEmpty()
                || !(routes.get(0) instanceof Map<?, ?> route)
                || !(route.get("distanceMeters") instanceof Number metres)) return null;
        return BigDecimal.valueOf(metres.longValue()).divide(BigDecimal.valueOf(1000), 2,
                java.math.RoundingMode.HALF_UP);
    }

    private Map<String, Object> waypoint(BigDecimal latitude, BigDecimal longitude) {
        return Map.of("location", Map.of("latLng", Map.of("latitude", latitude, "longitude", longitude)));
    }
}

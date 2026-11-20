package com.kuraliupdates.bazaar.security;

import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.service.ApiRateLimitService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockFilterChain;

import java.time.Duration;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.*;

class OtpAbuseProtectionFilterTest {
    @Test
    void appliesDeviceAndResolvedIpLimitsToOtpSend() throws Exception {
        ApiRateLimitService rateLimit = mock(ApiRateLimitService.class);
        TrustedClientIpResolver ipResolver = mock(TrustedClientIpResolver.class);
        when(ipResolver.resolve(any(HttpServletRequest.class))).thenReturn(Optional.of("203.0.113.8"));
        OtpAbuseProtectionFilter filter = new OtpAbuseProtectionFilter(rateLimit, ipResolver);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI("/api/v1/auth/send-otp");
        request.addHeader(OtpAbuseProtectionFilter.DEVICE_HEADER, "123e4567-e89b-42d3-a456-426614174000");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNotNull(chain.getRequest());
        verify(rateLimit).requireAllowed("otp-device-send", "123e4567-e89b-42d3-a456-426614174000",
                10, Duration.ofHours(1));
        verify(rateLimit).requireAllowed("otp-client-ip-send", "203.0.113.8",
                20, Duration.ofHours(1));
    }

    @Test
    void stopsOtpRequestWhenDeviceBucketIsExhausted() throws Exception {
        ApiRateLimitService rateLimit = mock(ApiRateLimitService.class);
        TrustedClientIpResolver ipResolver = mock(TrustedClientIpResolver.class);
        doThrow(new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests"))
                .when(rateLimit).requireAllowed("otp-device-send", "123e4567-e89b-42d3-a456-426614174000",
                        10, Duration.ofHours(1));
        OtpAbuseProtectionFilter filter = new OtpAbuseProtectionFilter(rateLimit, ipResolver);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("POST");
        request.setRequestURI("/api/v1/auth/send-otp");
        request.addHeader(OtpAbuseProtectionFilter.DEVICE_HEADER, "123e4567-e89b-42d3-a456-426614174000");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(429, response.getStatus());
        org.junit.jupiter.api.Assertions.assertNull(chain.getRequest());
        verify(ipResolver, never()).resolve(any(HttpServletRequest.class));
    }
}

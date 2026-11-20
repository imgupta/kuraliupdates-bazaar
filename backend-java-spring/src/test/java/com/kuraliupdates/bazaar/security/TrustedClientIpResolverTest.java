package com.kuraliupdates.bazaar.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TrustedClientIpResolverTest {
    @Test
    void resolvesClientAddressThroughConfiguredTrustedProxyChain() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("ku.security.trusted-proxy-cidrs", "10.0.0.0/8,192.168.0.0/16");
        TrustedClientIpResolver resolver = new TrustedClientIpResolver(environment);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.10");
        request.addHeader("X-Forwarded-For", "203.0.113.9, 192.168.1.8");

        assertEquals(Optional.of("203.0.113.9"), resolver.resolve(request));
    }

    @Test
    void ignoresForwardedHeaderWhenImmediatePeerIsNotTrusted() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("ku.security.trusted-proxy-cidrs", "10.0.0.0/8");
        TrustedClientIpResolver resolver = new TrustedClientIpResolver(environment);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.5");
        request.addHeader("X-Forwarded-For", "198.51.100.7");

        assertEquals(Optional.of("203.0.113.5"), resolver.resolve(request));
    }

    @Test
    void doesNotTrustForwardedHeadersUntilProxyRangesAreConfigured() {
        TrustedClientIpResolver resolver = new TrustedClientIpResolver(new MockEnvironment());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.10");
        request.addHeader("X-Forwarded-For", "203.0.113.9");

        assertEquals(Optional.empty(), resolver.resolve(request));
    }
}

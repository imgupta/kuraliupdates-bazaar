package com.kuraliupdates.bazaar.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Resolves a client address without trusting arbitrary Forwarded/X-Forwarded-For
 * headers. Forwarded addresses are used only when the immediate peer belongs to
 * an explicitly configured trusted-proxy CIDR chain.
 */
@Component
public class TrustedClientIpResolver {
    private final List<Cidr> trustedProxies;

    public TrustedClientIpResolver(Environment environment) {
        this.trustedProxies = parseCidrs(environment.getProperty("ku.security.trusted-proxy-cidrs", ""));
    }

    public Optional<String> resolve(HttpServletRequest request) {
        String remote = normalize(request.getRemoteAddr());
        if (remote == null) return Optional.empty();
        if (trustedProxies.isEmpty()) return Optional.empty();
        if (!isTrustedProxy(remote)) return Optional.of(remote);

        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded == null || forwarded.isBlank()) return Optional.empty();
        String[] entries = forwarded.split(",");
        List<String> chain = new ArrayList<>(entries.length);
        for (String entry : entries) {
            String address = normalize(entry.trim());
            if (address == null) return Optional.empty();
            chain.add(address);
        }

        String candidate = remote;
        for (int i = chain.size() - 1; i >= 0 && isTrustedProxy(candidate); i--) {
            candidate = chain.get(i);
        }
        return isTrustedProxy(candidate) ? Optional.empty() : Optional.of(candidate);
    }

    private boolean isTrustedProxy(String address) {
        return trustedProxies.stream().anyMatch(cidr -> cidr.contains(address));
    }

    private List<Cidr> parseCidrs(String configured) {
        if (configured == null || configured.isBlank()) return List.of();
        List<Cidr> result = new ArrayList<>();
        for (String raw : configured.split(",")) {
            String value = raw.trim();
            if (value.isEmpty()) continue;
            try {
                String[] parts = value.split("/", -1);
                byte[] address = InetAddress.getByName(parts[0]).getAddress();
                int bits = parts.length == 1 ? address.length * 8 : Integer.parseInt(parts[1]);
                if (parts.length > 2 || bits < 0 || bits > address.length * 8) {
                    throw new IllegalArgumentException("Invalid trusted proxy CIDR");
                }
                result.add(new Cidr(address, bits));
            } catch (UnknownHostException | NumberFormatException ex) {
                throw new IllegalArgumentException("Invalid ku.security.trusted-proxy-cidrs entry", ex);
            }
        }
        return List.copyOf(result);
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return InetAddress.getByName(value.trim()).getHostAddress();
        } catch (UnknownHostException ex) {
            return null;
        }
    }

    private record Cidr(byte[] network, int prefixBits) {
        boolean contains(String address) {
            try {
                byte[] candidate = InetAddress.getByName(address).getAddress();
                if (candidate.length != network.length) return false;
                int fullBytes = prefixBits / 8;
                int remainingBits = prefixBits % 8;
                for (int i = 0; i < fullBytes; i++) {
                    if (candidate[i] != network[i]) return false;
                }
                if (remainingBits == 0) return true;
                int mask = 0xff << (8 - remainingBits);
                return (candidate[fullBytes] & mask) == (network[fullBytes] & mask);
            } catch (UnknownHostException ex) {
                return false;
            }
        }
    }
}

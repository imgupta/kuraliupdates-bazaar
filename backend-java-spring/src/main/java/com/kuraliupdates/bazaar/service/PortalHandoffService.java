package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.PortalHandoffEntity;
import com.kuraliupdates.bazaar.repository.PortalHandoffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PortalHandoffService {
    private static final long TTL_SECONDS = 60;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PortalHandoffRepository repository;

    @Transactional
    public String create(String sessionToken, String role) {
        LocalDateTime now = LocalDateTime.now();
        repository.deleteByExpiresAtBefore(now);
        byte[] randomCode = new byte[32];
        RANDOM.nextBytes(randomCode);
        String code = HexFormat.of().formatHex(randomCode);
        repository.save(PortalHandoffEntity.builder()
                .codeHash(sha256(code))
                .sessionToken(sessionToken)
                .role(role)
                .createdAt(now)
                .expiresAt(now.plusSeconds(TTL_SECONDS))
                .build());
        return code;
    }

    /**
     * Commits the one-time consume in its own transaction before the caller
     * revalidates the underlying session and target role. A failed role/session
     * check must not roll back the consume and make the handoff replayable.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<PortalHandoffEntity> consume(String code) {
        if (code == null || code.isBlank() || code.length() != 64) return Optional.empty();
        String codeHash = sha256(code);
        LocalDateTime consumedAt = LocalDateTime.now();
        if (repository.consume(codeHash, consumedAt) != 1) return Optional.empty();
        return repository.findById(codeHash);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }
}

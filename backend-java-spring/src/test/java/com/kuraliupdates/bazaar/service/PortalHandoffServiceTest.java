package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.PortalHandoffEntity;
import com.kuraliupdates.bazaar.repository.PortalHandoffRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PortalHandoffServiceTest {

    @Mock private PortalHandoffRepository repository;

    @Test
    void createsHighEntropyCodeAndStoresOnlyItsDigest() {
        when(repository.save(any(PortalHandoffEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        PortalHandoffService service = new PortalHandoffService(repository);

        String code = service.create("active-session", "SELLER");

        assertEquals(64, code.length());
        ArgumentCaptor<PortalHandoffEntity> captor = ArgumentCaptor.forClass(PortalHandoffEntity.class);
        verify(repository).save(captor.capture());
        PortalHandoffEntity stored = captor.getValue();
        assertNotEquals(code, stored.getCodeHash());
        assertEquals(64, stored.getCodeHash().length());
        assertEquals("active-session", stored.getSessionToken());
        assertEquals("SELLER", stored.getRole());
        assertEquals(60, java.time.Duration.between(stored.getCreatedAt(), stored.getExpiresAt()).getSeconds());
    }

    @Test
    void doesNotLookupOrReturnHandoffWhenAtomicConsumeFails() {
        when(repository.consume(anyString(), any(LocalDateTime.class))).thenReturn(0);
        PortalHandoffService service = new PortalHandoffService(repository);

        assertTrue(service.consume("a".repeat(64)).isEmpty());
        verify(repository, never()).findById(anyString());
    }

    @Test
    void loadsHandoffOnlyAfterAtomicConsumeSucceeds() {
        PortalHandoffEntity stored = PortalHandoffEntity.builder()
                .codeHash("b".repeat(64))
                .sessionToken("active-session")
                .role("SELLER")
                .createdAt(LocalDateTime.now().minusSeconds(5))
                .expiresAt(LocalDateTime.now().plusSeconds(55))
                .build();
        when(repository.consume(anyString(), any(LocalDateTime.class))).thenReturn(1);
        when(repository.findById(anyString())).thenReturn(Optional.of(stored));
        PortalHandoffService service = new PortalHandoffService(repository);

        assertEquals(stored, service.consume("b".repeat(64)).orElseThrow());
        verify(repository).consume(anyString(), any(LocalDateTime.class));
        verify(repository).findById(anyString());
    }

    @Test
    void rejectsMalformedCodesBeforeDatabaseAccess() {
        PortalHandoffService service = new PortalHandoffService(repository);
        assertTrue(service.consume("not-a-code").isEmpty());
        verifyNoInteractions(repository);
    }
}

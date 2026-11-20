package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.AdminMfaFactorEntity;
import com.kuraliupdates.bazaar.repository.AdminMfaFactorRepository;
import com.kuraliupdates.bazaar.repository.AdminMfaRecoveryCodeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminMfaServiceTest {
    private static final String ROOT_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";

    @Test
    void enrollmentEncryptsTotpSecretAndIssuesSessionBoundStepUpAndRecoveryCodes() {
        AdminMfaFactorRepository factors = mock(AdminMfaFactorRepository.class);
        AdminMfaRecoveryCodeRepository recovery = mock(AdminMfaRecoveryCodeRepository.class);
        when(factors.save(any(AdminMfaFactorEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(recovery.deleteAllForUser("admin-1")).thenReturn(0);
        AdminMfaService service = new AdminMfaService(factors, recovery,
                new MockEnvironment().withProperty("app.jwt.secret", ROOT_SECRET));

        AdminMfaService.Enrollment enrollment = service.beginEnrollment("admin-1", "admin@example.test");
        AdminMfaFactorEntity factor = org.mockito.ArgumentCaptor.forClass(AdminMfaFactorEntity.class).getValue();
        // Capture the entity persisted by enrollment without relying on an unencrypted field.
        org.mockito.ArgumentCaptor<AdminMfaFactorEntity> saved = org.mockito.ArgumentCaptor.forClass(AdminMfaFactorEntity.class);
        verify(factors).save(saved.capture());
        factor = saved.getValue();
        assertNotEquals(enrollment.secret(), factor.getEncryptedSecret());
        assertTrue(enrollment.otpauthUri().startsWith("otpauth://totp/"));

        when(factors.findById("admin-1")).thenReturn(Optional.of(factor));
        String currentCode = AdminMfaService.totpCode(enrollment.secret(), Instant.now());
        AdminMfaService.Confirmation confirmation = service.confirmEnrollment("admin-1", "session-token", currentCode);

        assertEquals(10, confirmation.recoveryCodes().size());
        assertNotNull(confirmation.stepUpToken());
        assertEquals(1, factor.getEnabled());
        assertTrue(service.isStepUpValid("admin-1", "session-token", confirmation.stepUpToken()));
        assertFalse(service.isStepUpValid("admin-1", "different-session", confirmation.stepUpToken()));
        verify(recovery, times(10)).save(any());
    }

    @Test
    void recoveryCodeCanBeConsumedOnceToCreateNewStepUp() {
        AdminMfaFactorRepository factors = mock(AdminMfaFactorRepository.class);
        AdminMfaRecoveryCodeRepository recovery = mock(AdminMfaRecoveryCodeRepository.class);
        when(recovery.consume(eq("admin-1"), anyString(), any())).thenReturn(1);
        AdminMfaFactorEntity factor = AdminMfaFactorEntity.builder()
                .userId("admin-1").encryptedSecret("encrypted").enabled(1).build();
        AdminMfaService service = spy(new AdminMfaService(factors, recovery,
                new MockEnvironment().withProperty("app.jwt.secret", ROOT_SECRET)));
        doReturn("JBSWY3DPEHPK3PXP").when(service).decryptForTest(anyString());
        when(factors.findById("admin-1")).thenReturn(Optional.of(factor));
        // The recovery-code path does not need the TOTP secret to decrypt successfully.
        doReturn(false).when(service).verifyTotpForTest(anyString(), anyString(), any());

        String token = service.verifyStepUp("admin-1", "session-token", "ABCD-EFGH-IJKL-MNOP-QRST");

        assertNotNull(token);
        verify(recovery).consume(eq("admin-1"), anyString(), any());
        assertTrue(service.isStepUpValid("admin-1", "session-token", token));
    }
}

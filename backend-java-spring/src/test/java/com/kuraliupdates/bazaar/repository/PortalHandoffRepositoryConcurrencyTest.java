package com.kuraliupdates.bazaar.repository;

import com.kuraliupdates.bazaar.entity.PortalHandoffEntity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:portal_handoff_concurrency;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class PortalHandoffRepositoryConcurrencyTest {

    @Autowired
    private PortalHandoffRepository repository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void concurrentConsumeAllowsExactlyOneWinner() throws Exception {
        String hash = "a".repeat(64);
        LocalDateTime now = LocalDateTime.now();
        inTransaction(() -> repository.saveAndFlush(PortalHandoffEntity.builder()
                .codeHash(hash)
                .sessionToken("session")
                .role("SELLER")
                .createdAt(now.minusSeconds(1))
                .expiresAt(now.plusSeconds(60))
                .build()));

        List<Integer> outcomes = runTogether(
                () -> inTransactionResult(() -> repository.consume(hash, LocalDateTime.now())),
                () -> inTransactionResult(() -> repository.consume(hash, LocalDateTime.now()))
        );

        assertEquals(1, outcomes.stream().filter(rows -> rows == 1).count(),
                "exactly one concurrent request must consume the handoff");
        assertEquals(1, outcomes.stream().mapToInt(Integer::intValue).sum(),
                "the conditional update must affect exactly one row in total");

        PortalHandoffEntity stored = inTransactionResult(() -> repository.findById(hash).orElseThrow());
        assertNotNull(stored.getConsumedAt(), "the winning consume must be committed");
    }

    @Test
    void concurrentExpiredCleanupIsIdempotent() throws Exception {
        String hash = "b".repeat(64);
        LocalDateTime now = LocalDateTime.now();
        inTransaction(() -> repository.saveAndFlush(PortalHandoffEntity.builder()
                .codeHash(hash)
                .sessionToken("expired-session")
                .role("BUYER")
                .createdAt(now.minusMinutes(2))
                .expiresAt(now.minusMinutes(1))
                .build()));

        List<Integer> outcomes = runTogether(
                () -> inTransactionResult(() -> repository.deleteExpiredBefore(LocalDateTime.now())),
                () -> inTransactionResult(() -> repository.deleteExpiredBefore(LocalDateTime.now()))
        );

        assertEquals(1, outcomes.stream().mapToInt(Integer::intValue).sum(),
                "concurrent set-based cleanup should delete the expired row exactly once");
        assertTrue(inTransactionResult(() -> repository.findById(hash)).isEmpty(),
                "the expired handoff must be absent after both cleanup transactions commit");
    }

    private void inTransaction(Runnable work) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        template.executeWithoutResult(status -> work.run());
    }

    private <T> T inTransactionResult(java.util.function.Supplier<T> work) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return template.execute(status -> work.get());
    }

    private <T> List<T> runTogether(Callable<T> first, Callable<T> second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<T> firstResult = executor.submit(gated(first, ready, start));
            Future<T> secondResult = executor.submit(gated(second, ready, start));
            assertTrue(ready.await(5, TimeUnit.SECONDS), "both workers must reach the start barrier");
            start.countDown();
            return List.of(
                    firstResult.get(15, TimeUnit.SECONDS),
                    secondResult.get(15, TimeUnit.SECONDS)
            );
        } finally {
            start.countDown();
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS),
                    "concurrency test workers should terminate");
        }
    }

    private <T> Callable<T> gated(Callable<T> task, CountDownLatch ready, CountDownLatch start) {
        return () -> {
            ready.countDown();
            if (!start.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting for concurrent start");
            }
            return task.call();
        };
    }
}

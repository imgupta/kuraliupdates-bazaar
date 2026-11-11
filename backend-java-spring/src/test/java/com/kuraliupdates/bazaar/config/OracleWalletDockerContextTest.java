package com.kuraliupdates.bazaar.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;

class OracleWalletDockerContextTest {
    @Test
    void dockerBuildContextExcludesWalletArchivesAndRuntimeWalletMaterial() throws IOException {
        String dockerfile = Files.readString(Path.of("Dockerfile"));
        String dockerignore = Files.readString(Path.of(".dockerignore"));

        assertFalse(dockerfile.contains("Wallet"));
        assertFalse(dockerfile.contains("wallet.zip"));
        assertFalse(dockerfile.contains("unzip"));
        assertFalse(dockerfile.contains("/app/wallet"));
        assertTrue(dockerfile.contains("COPY --from=builder /app/target/kurali-bazaar-api-1.0.0-SNAPSHOT.jar app.jar"));
        assertTrue(dockerignore.contains("Wallet*.zip"));
        assertTrue(dockerignore.contains("wallet/"));
        List<String> imageCopyInstructions = dockerfile.lines()
                .map(String::trim)
                .filter(line -> line.startsWith("COPY ") || line.startsWith("ADD "))
                .toList();
        assertTrue(imageCopyInstructions.stream().allMatch(line -> line.contains("pom.xml")
                || line.contains("src ./src")
                || line.contains("/app/target/kurali-bazaar-api-1.0.0-SNAPSHOT.jar app.jar")));
        try (var files = Files.list(Path.of("."))) {
            assertFalse(files.anyMatch(path -> path.getFileName().toString().startsWith("Wallet")
                    && path.getFileName().toString().endsWith(".zip")));
        }
    }
}

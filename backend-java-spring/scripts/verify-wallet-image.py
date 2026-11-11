#!/usr/bin/env python3
"""Build and inspect the final Docker image without printing image contents."""

import io
import json
import os
import shutil
import subprocess
import tarfile
import tempfile
import zipfile
from pathlib import PurePosixPath


WALLET_FILENAMES = {
    "tnsnames.ora",
    "sqlnet.ora",
    "cwallet.sso",
    "ewallet.p12",
    "truststore.jks",
    "keystore.jks",
}


def is_wallet_artifact(name: str) -> bool:
    basename = PurePosixPath(name).name.lower()
    return basename in WALLET_FILENAMES or (basename.startswith("wallet") and basename.endswith(".zip"))


def scan_zip(data: bytes, depth: int = 0) -> tuple[bool, bool]:
    found_wallet = False
    found_test_marker = False
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for entry in archive.infolist():
            if is_wallet_artifact(entry.filename):
                found_wallet = True
            entry_data = archive.read(entry)
            if b"ci-placeholder-" in entry_data:
                found_test_marker = True
            if depth < 3 and entry.filename.lower().endswith((".jar", ".zip")):
                nested_wallet, nested_test_marker = scan_zip(entry_data, depth + 1)
                found_wallet = found_wallet or nested_wallet
                found_test_marker = found_test_marker or nested_test_marker
    return found_wallet, found_test_marker


def inspect_image(image_archive: str) -> tuple[bool, bool, bool]:
    found_wallet = False
    found_application_jar = False
    found_test_marker = False
    with tarfile.open(image_archive, mode="r:*") as image:
        manifest = json.load(image.extractfile("manifest.json"))
        for image_record in manifest:
            config_stream = image.extractfile(image_record["Config"])
            if config_stream is not None and b"ci-placeholder-" in config_stream.read():
                found_test_marker = True
            for layer_name in image_record["Layers"]:
                layer_stream = image.extractfile(layer_name)
                if layer_stream is None:
                    raise RuntimeError("Docker image layer could not be read")
                layer_bytes = layer_stream.read()
                with tarfile.open(fileobj=io.BytesIO(layer_bytes), mode="r:*") as layer:
                    for entry in layer.getmembers():
                        if is_wallet_artifact(entry.name):
                            found_wallet = True
                        if entry.isfile() and entry.size <= 2_000_000 and entry.name.lower().endswith(
                                (".xml", ".yml", ".yaml", ".properties", ".json", ".txt", ".conf", ".sh", ".md")):
                            text_stream = layer.extractfile(entry)
                            if text_stream is not None and b"ci-placeholder-" in text_stream.read():
                                found_test_marker = True
                        if PurePosixPath(entry.name).name == "app.jar" and entry.isfile():
                            jar_stream = layer.extractfile(entry)
                            if jar_stream is None:
                                raise RuntimeError("Application archive could not be read")
                            found_application_jar = True
                            jar_wallet, jar_test_marker = scan_zip(jar_stream.read())
                            found_wallet = found_wallet or jar_wallet
                            found_test_marker = found_test_marker or jar_test_marker
    return found_wallet, found_application_jar, found_test_marker


def verify_test_wallet_context_is_excluded(dockerfile_path: str) -> None:
    result = subprocess.run(
        ["docker", "build", "--file", dockerfile_path, "--tag", "kuraliupdates-wallet-context-probe:local", "."],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError("Docker context probe found wallet fixture files in the filtered build context")


def main() -> int:
    image = f"kuraliupdates-wallet-content-check:{os.environ.get('GITHUB_SHA', 'local')}"
    probe_image = "kuraliupdates-wallet-context-probe:local"
    temp_directory = tempfile.mkdtemp(prefix="kuraliupdates-wallet-image-")
    image_archive = os.path.join(temp_directory, "image.tar")
    probe_dockerfile = os.path.join(temp_directory, "Dockerfile.context-probe")
    try:
        subprocess.run(["docker", "build", "--tag", image, "."], check=True)
        subprocess.run(["docker", "save", "--output", image_archive, image], check=True)
        found_wallet, found_application_jar, found_test_marker = inspect_image(image_archive)
        if found_wallet or found_test_marker or not found_application_jar:
            print("FAIL: final image layer/application archive content verification failed")
            return 1

        fixtures = (
            "tnsnames.ora sqlnet.ora cwallet.sso ewallet.p12 truststore.jks keystore.jks"
        )
        with open(probe_dockerfile, "w", encoding="utf-8") as file:
            file.write(
                "FROM eclipse-temurin:17-jre-alpine\n"
                "RUN --mount=type=bind,target=/context,readonly "
                f"for name in {fixtures}; do "
                "test ! -e \"/context/src/test/resources/oracle-wallet-fixture/$name\" || exit 13; "
                "done\n"
            )
        verify_test_wallet_context_is_excluded(probe_dockerfile)
        print("PASS: all six fixtures are excluded from build context; all final image layers and nested app archives are free of wallet artifacts and test-only values")
        return 0
    finally:
        subprocess.run(["docker", "image", "rm", "--force", image], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, check=False)
        subprocess.run(["docker", "image", "rm", "--force", probe_image], stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, check=False)
        shutil.rmtree(temp_directory, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())

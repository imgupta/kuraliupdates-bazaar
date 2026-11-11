#!/usr/bin/env bash
set -uo pipefail

max_attempts=3
for attempt in $(seq 1 "$max_attempts"); do
  if bunx playwright install --with-deps chromium; then
    exit 0
  fi
  if [ "$attempt" -lt "$max_attempts" ]; then
    echo "Playwright Chromium installation failed (attempt ${attempt}/${max_attempts}); retrying after transient runner/package-network failure."
    sleep 15
  fi
done

echo "Playwright Chromium installation failed after ${max_attempts} attempts."
exit 1

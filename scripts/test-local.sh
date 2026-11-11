#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_ROOT="$ROOT_DIR/test-reports/local"
REPORT_DIR=""
SUITES=()
RUN_ALL=false
SHOW_REPORT=false

usage() {
  cat <<'EOF'
Usage: ./scripts/test-local.sh [--backend] [--frontend] [--e2e] [--security] [--all] [--report]

Suites can be combined. --report prints the latest saved suite summary and can
be used alone. Backend and Oracle-independent tests are labelled explicitly;
the staging transactional E2E suite is never invoked by this local runner.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --backend|--frontend|--e2e|--security) SUITES+=("${arg#--}") ;;
    --all) RUN_ALL=true ;;
    --report) SHOW_REPORT=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ "$SHOW_REPORT" == true && ${#SUITES[@]} -eq 0 && "$RUN_ALL" == false ]]; then
  latest="$(find "$REPORT_ROOT" -mindepth 1 -maxdepth 1 -type d -name 'run-*' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)"
  if [[ -z "$latest" || ! -f "$latest/summary.tsv" ]]; then
    echo "No local test report exists yet under test-reports/local/."
    exit 1
  fi
  cat "$latest/summary.tsv"
  echo "Report directory: ${latest#"$ROOT_DIR/"}"
  exit 0
fi

if [[ "$RUN_ALL" == true ]]; then SUITES=(backend frontend security e2e); fi
if [[ ${#SUITES[@]} -eq 0 ]]; then usage >&2; exit 2; fi

mkdir -p "$REPORT_ROOT"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
REPORT_DIR="$REPORT_ROOT/run-$RUN_ID"
mkdir -p "$REPORT_DIR"
SUMMARY="$REPORT_DIR/summary.tsv"
printf 'suite\tclassification\tresult\tpassed\tfailed\tskipped\n' > "$SUMMARY"
OVERALL=0

summarize() {
  local file="$1" result="$2" counts passed=0 failed=0 skipped=0
  counts="$(node - "$file" <<'NODE'
const fs = require('node:fs');
const s = fs.readFileSync(process.argv[2], 'utf8').replace(/\u001b\[[0-9;]*m/g, '');
let m, last;
const maven = /Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)/g;
while ((m = maven.exec(s))) last = [Number(m[1]), Number(m[2]) + Number(m[3]), Number(m[4])];
if (last) { console.log(last.join('\t')); process.exit(0); }
const tap = /ℹ tests (\d+)[\s\S]*?ℹ pass (\d+)[\s\S]*?ℹ fail (\d+)[\s\S]*?ℹ skipped (\d+)/g;
while ((m = tap.exec(s))) last = [Number(m[2]), Number(m[3]), Number(m[4])];
if (last) { console.log(last.join('\t')); process.exit(0); }
const playwrightCount = label => {
  const matches = [...s.matchAll(new RegExp('(?:^|\\n)\\s*(\\d+) ' + label + '\\b', 'g'))];
  return matches.length ? Number(matches[matches.length - 1][1]) : 0;
};
if (/Running \d+ tests? using/.test(s)) {
  console.log([playwrightCount('passed'), playwrightCount('failed'), playwrightCount('skipped')].join('\t'));
  process.exit(0);
}
console.log('0\t0\t0');
NODE
  )"
  IFS=$'\t' read -r passed failed skipped <<< "$counts"
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$SUITE_NAME" "$CLASSIFICATION" "$result" "$passed" "$failed" "$skipped" >> "$SUMMARY"
}

run_suite() {
  SUITE_NAME="$1"; CLASSIFICATION="$2"; shift 2
  local logfile="$REPORT_DIR/$SUITE_NAME.log" result=PASS
  echo "== $SUITE_NAME ($CLASSIFICATION) =="
  (cd "$ROOT_DIR" && "$@") > "$logfile" 2>&1 || result=FAIL
  cat "$logfile"
  summarize "$logfile" "$result"
  if [[ "$result" == FAIL ]]; then OVERALL=1; fi
  echo "Result: $result; log: ${logfile#"$ROOT_DIR/"}"
}

for suite in "${SUITES[@]}"; do
  case "$suite" in
    backend)
      run_suite backend 'unit + mocked persistence; no Oracle runtime proof' \
        mvn -o -f backend-java-spring/pom.xml -DargLine=-Dnet.bytebuddy.experimental=true test
      run_suite backend-package 'compile/package; tests already recorded above' \
        mvn -o -f backend-java-spring/pom.xml -DskipTests package
      ;;
    security)
      run_suite security 'focused auth, OTP, session, role and ownership regressions; mocked/HTTP-test contexts' \
        mvn -o -f backend-java-spring/pom.xml -DargLine=-Dnet.bytebuddy.experimental=true \
        -Dtest=SecurityConfigTest,SessionAuthenticationFilterTest,AuthServicePortalSessionTest,AuthRegisteredRolesTest,OtpServiceTest,OtpAttemptServiceTest,OtpAttemptServiceJdbcTest,DeliveryControllerRoleTest,SellerControllerAuthorizationTest,SellerRegistrationOtpConfigControllerSecurityTest,AuthControllerPortalHandoffTest,AdminSellerOnboardingControllerSecurityTest,BuyerControllerOrderAuthorizationTest,NegotiationChatControllerAuthorizationTest,DeliveryTrackingControllerSecurityTest test
      ;;
    frontend)
      run_suite frontend-types 'TypeScript static check' npm run lint
      run_suite frontend-regressions 'local Node/TypeScript unit regressions' \
        node --import tsx --test --test-concurrency=1 tests/*.test.ts
      run_suite frontend-build-impact 'local build-policy and smoke regressions' \
        node --test --test-concurrency=1 tests/*.test.mjs
      run_suite frontend-build 'Vite production build' npm run build
      for portal in buyer seller delivery daily-help admin; do
        run_suite "portal-$portal-build" 'independent Vite role portal build' npm run "build:$portal"
      done
      ;;
    e2e)
      if [[ ! -x "$ROOT_DIR/node_modules/.bin/playwright" ]]; then
        echo 'Playwright is unavailable in this checkout. Install the repository E2E dependency and Chromium before running --e2e.' > "$REPORT_DIR/e2e.log"
        cat "$REPORT_DIR/e2e.log"
        summarize "$REPORT_DIR/e2e.log" FAIL
        OVERALL=1
        continue
      fi
      if [[ ! -f "$ROOT_DIR/playwright.local.config.ts" ]]; then
        echo 'A dedicated local-mock Playwright configuration is not present; staging E2E is intentionally excluded.' > "$REPORT_DIR/e2e.log"
        cat "$REPORT_DIR/e2e.log"
        summarize "$REPORT_DIR/e2e.log" FAIL
        OVERALL=1
        continue
      fi
      run_suite e2e 'local browser tests with mocked API; no staging or Oracle writes' \
        node_modules/.bin/playwright test --config=playwright.local.config.ts
      ;;
  esac
done

echo
cat "$SUMMARY"
echo "Report directory: ${REPORT_DIR#"$ROOT_DIR/"}"
exit "$OVERALL"

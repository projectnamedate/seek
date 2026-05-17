#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  cat >&2 <<'USAGE'
Usage: bash dapp-store-publishing/scripts/capture-screenshot.sh <slot> [adb-serial]

Slots:
  01-home
  02-connect-wallet
  03-start-hunt
  04-mission
  05-validation
  06-results

Example:
  bash dapp-store-publishing/scripts/capture-screenshot.sh 01-home
  bash dapp-store-publishing/scripts/capture-screenshot.sh 01-home R5CT123ABC
  SCREENSHOT_OUT_DIR=dapp-store-publishing/assets/review/screenshots-dry-run-20260504 \
    bash dapp-store-publishing/scripts/capture-screenshot.sh 01-home
USAGE
  exit 2
fi

slot="$1"
serial="${2:-}"

case "$slot" in
  01-home|02-connect-wallet|03-start-hunt|04-mission|05-validation|06-results) ;;
  *)
    echo "Unknown screenshot slot: $slot" >&2
    exit 2
    ;;
esac

if ! command -v adb >/dev/null 2>&1; then
  echo "adb is not installed or not on PATH." >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
default_out_dir="$repo_root/dapp-store-publishing/assets/screenshots/en-US"
out_dir="${SCREENSHOT_OUT_DIR:-$default_out_dir}"
if [[ "$out_dir" != /* ]]; then
  out_dir="$repo_root/$out_dir"
fi
out_file="$out_dir/$slot.png"

adb_args=()
if [[ -n "$serial" ]]; then
  adb_args=(-s "$serial")
fi

mkdir -p "$out_dir"

state="$(adb "${adb_args[@]}" get-state 2>/dev/null || true)"
if [[ "$state" != "device" ]]; then
  echo "No adb device is ready. Connect/unlock the device and enable USB debugging." >&2
  exit 1
fi

adb "${adb_args[@]}" exec-out screencap -p > "$out_file"

echo "Captured $out_file"
if command -v sips >/dev/null 2>&1; then
  sips -g pixelWidth -g pixelHeight "$out_file"
fi

#!/usr/bin/env bash
set -euo pipefail

REPO="simone-gheller/mull" # TODO: update after repo rename to vextis
BIN_NAME="vextis"
INSTALL_DIR="${VEXTIS_INSTALL_DIR:-/usr/local/bin}"

# First arg or VEXTIS_VERSION env var; empty = fetch latest
VERSION="${1:-${VEXTIS_VERSION:-}}"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64)        ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "error: unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

case "$OS" in
  darwin|linux) ;;
  *) echo "error: unsupported OS: $OS" >&2; exit 1 ;;
esac

# Determine latest version to install
if [[ -z "$VERSION" ]]; then
  echo "Fetching latest vextis release…"
  VERSION=$(curl -fsSLI -o /dev/null -w '%{url_effective}' \
    "https://github.com/${REPO}/releases/latest" \
    | grep -o 'v[0-9][^/]*$')
  if [[ -z "$VERSION" ]]; then
    echo "error: could not determine latest release" >&2
    exit 1
  fi
fi

ASSET_NAME="${BIN_NAME}-${OS}-${ARCH}"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET_NAME}"

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

echo "Downloading vextis ${VERSION} (${OS}-${ARCH})…"
if ! curl -fsSL "$DOWNLOAD_URL" -o "$TMP"; then
  echo "error: download failed — verify that version ${VERSION} exists" >&2
  echo "  https://github.com/${REPO}/releases" >&2
  exit 1
fi
chmod +x "$TMP"

if [[ -w "$INSTALL_DIR" ]]; then
  mv "$TMP" "${INSTALL_DIR}/${BIN_NAME}"
else
  sudo mv "$TMP" "${INSTALL_DIR}/${BIN_NAME}"
fi

echo "✓ vextis ${VERSION} installed → ${INSTALL_DIR}/${BIN_NAME}"

#!/usr/bin/env bash
set -euo pipefail

REPO="sgheller/safeconfig"
BIN_NAME="mull"
INSTALL_DIR="/usr/local/bin"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64)  ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

case "$OS" in
  darwin|linux) ;;
  *) echo "Unsupported OS: $OS" >&2; exit 1 ;;
esac

ASSET_NAME="${BIN_NAME}-${OS}-${ARCH}"

echo "Fetching latest mull release…"
LATEST=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
  | grep '"tag_name"' | head -1 | cut -d'"' -f4)

if [[ -z "$LATEST" ]]; then
  echo "Could not determine latest release." >&2
  exit 1
fi

DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${LATEST}/${ASSET_NAME}"
TMP=$(mktemp)

echo "Downloading ${ASSET_NAME} (${LATEST})…"
curl -fsSL "$DOWNLOAD_URL" -o "$TMP"
chmod +x "$TMP"

if [[ -w "$INSTALL_DIR" ]]; then
  mv "$TMP" "${INSTALL_DIR}/${BIN_NAME}"
else
  sudo mv "$TMP" "${INSTALL_DIR}/${BIN_NAME}"
fi

echo "✓ mull ${LATEST} installed at ${INSTALL_DIR}/${BIN_NAME}"

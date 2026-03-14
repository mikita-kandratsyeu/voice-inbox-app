#!/bin/bash
# Removes alpha channel from iOS app icons (required by App Store validation).
# Uses sips: PNG -> BMP (strips alpha) -> PNG

set -e
ICONSET="ios/VoiceInboxApp/Images.xcassets/AppIcon.appiconset"
cd "$(dirname "$0")/.."

for f in "$ICONSET"/*.png; do
  [ -f "$f" ] || continue
  tmp="${f}.tmp.bmp"
  echo "Processing: $f"
  sips -s format bmp "$f" --out "$tmp"
  sips -s format png "$tmp" --out "$f"
  rm -f "$tmp"
done

echo "Done. Alpha channel removed from all app icons."

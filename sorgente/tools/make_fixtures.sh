#!/bin/bash
# Fake-camera videos for test31 (barcode scanner). Needs ffmpeg. ~27 MB each, not committed.
cd "$(dirname "$0")/../fixtures"
for f in ean ean_v; do [ -f $f.y4m ] || ffmpeg -loglevel error -loop 1 -i $f.png -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:white" -frames:v 20 -pix_fmt yuv420p $f.y4m; done

#!/usr/bin/env bash
# Pin an image to a digest in a GitOps values file (rssb-app chart), changing
# only that one line, so comments and layout stay intact (yq would reformat).
#
# Usage: gitops-set-digest.sh <values.yaml> <image-repository> <sha256:...> <note>
# Expects each component's image in this shape:
#   image:
#     repository: ghcr.io/owner/app
#     digest: sha256:... # note
set -euo pipefail

file=$1 image=$2 digest=$3 note=$4

[[ $digest =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "not a sha256 digest: '$digest'" >&2; exit 1; }
grep -qE "^ +repository: ${image//./\.}$" "$file" || { echo "image '$image' not found in $file" >&2; exit 1; }

# On the line after "repository: <image>", replace the digest (same indentation).
sed -i -E "\|^ +repository: ${image//./\.}\$|{n;s|^( +)digest: .*|\1digest: ${digest} # ${note}|}" "$file"

grep -A1 -E "^ +repository: ${image//./\.}$" "$file"

#!/usr/bin/env bash
# Pin an image to a digest in a Kustomize overlay, keeping the file's layout and
# comments (unlike `kustomize edit set image`, which rewrites the whole file).
#
# Usage: gitops-set-digest.sh <kustomization.yaml> <image-name> <sha256:...> <note>
# Expects the overlay's images list in this shape:
#   images:
#     - name: ghcr.io/owner/app
#       digest: sha256:... # note
set -euo pipefail

file=$1 image=$2 digest=$3 note=$4

[[ $digest =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "not a sha256 digest: '$digest'" >&2; exit 1; }
grep -qx "  - name: ${image}" "$file" || { echo "image '$image' not found in $file" >&2; exit 1; }

# On the line after "- name: <image>", replace the digest line.
sed -i "\|^  - name: ${image}\$|{n;s|^    digest: .*|    digest: ${digest} # ${note}|}" "$file"

grep -A1 -x "  - name: ${image}" "$file"

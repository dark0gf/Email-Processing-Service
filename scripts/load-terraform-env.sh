#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f ./.env ]]; then
  echo "Missing .env file in repository root" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

if ! grep -q '^\[terraform\]' "${HOME}/.aws/credentials" 2>/dev/null; then
  echo "Error: [terraform] profile not found in ~/.aws/credentials" >&2
  echo "Run: bash scripts/setup-terraform-iam.sh" >&2
  exit 1
fi

export AWS_PROFILE=terraform
terraform -chdir=terraform "$@"

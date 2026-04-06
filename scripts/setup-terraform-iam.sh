#!/bin/bash

set -e

# Configuration
USER_NAME="${1:-terraform-user}"
POLICY_NAME="${USER_NAME}-policy"
AWS_REGION="${2:-eu-west-1}"
BOOTSTRAP_PROFILE="${AWS_BOOTSTRAP_PROFILE:-${AWS_PROFILE:-default}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLICY_DOC="${SCRIPT_DIR}/terraform-policy.json"

profile_exists() {
  env AWS_PROFILE= AWS_DEFAULT_PROFILE= aws configure list-profiles 2>/dev/null | grep -Fxq "$1"
}

if [ "$BOOTSTRAP_PROFILE" = "terraform" ] && ! profile_exists "terraform"; then
  echo "[WARN] AWS_PROFILE=terraform is set, but the profile does not exist yet."
  echo "[WARN] Falling back to bootstrap profile 'default' for IAM setup."
  BOOTSTRAP_PROFILE="default"
fi

aws_bootstrap() {
  env AWS_PROFILE= AWS_DEFAULT_PROFILE= aws --profile "$BOOTSTRAP_PROFILE" --region "$AWS_REGION" "$@"
}

echo "[SETUP] Setting up IAM user for Terraform..."
echo "User: $USER_NAME"
echo "Policy: $POLICY_NAME"
echo "Region: $AWS_REGION"
echo "Bootstrap profile: $BOOTSTRAP_PROFILE"
echo ""

# Step 1: Create IAM user if it doesn't exist
echo "[CREATE] Creating IAM user '$USER_NAME'..."
if aws_bootstrap iam get-user --user-name "$USER_NAME" >/dev/null 2>&1; then
  echo "[OK] User '$USER_NAME' already exists"
else
  aws_bootstrap iam create-user --user-name "$USER_NAME"
  echo "[OK] Created user '$USER_NAME'"
fi

# Step 2: Create and attach policy
echo "[POLICY] Creating policy '$POLICY_NAME'..."
if [ ! -f "$POLICY_DOC" ]; then
  echo "[ERROR] Policy document not found: $POLICY_DOC"
  exit 1
fi

# Check if policy exists; create or update it
ACCOUNT_ID=$(aws_bootstrap sts get-caller-identity --query Account --output text)
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/$POLICY_NAME"

if aws_bootstrap iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
  echo "[UPDATE] Policy '$POLICY_NAME' exists — creating new version..."
  # IAM allows max 5 versions; delete oldest non-default version if needed
  VERSIONS=$(aws_bootstrap iam list-policy-versions --policy-arn "$POLICY_ARN" \
    --query 'Versions[?IsDefaultVersion==`false`].[VersionId,CreateDate]' \
    --output text | sort -k2 | head -1 | awk '{print $1}')
  if [ -n "$VERSIONS" ]; then
    aws_bootstrap iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$VERSIONS"
    echo "[OK] Removed oldest non-default version: $VERSIONS"
  fi
  aws_bootstrap iam create-policy-version \
    --policy-arn "$POLICY_ARN" \
    --policy-document "file://${POLICY_DOC}" \
    --set-as-default \
    >/dev/null
  echo "[OK] Updated policy '$POLICY_NAME' with new default version"
else
  aws_bootstrap iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "file://${POLICY_DOC}" \
    >/dev/null
  echo "[OK] Created policy '$POLICY_NAME'"
fi

# Step 3: Attach policy to user
echo "[ATTACH] Attaching policy to user..."
ATTACHED=$(aws_bootstrap iam list-attached-user-policies --user-name "$USER_NAME" --query "AttachedPolicies[?PolicyName=='$POLICY_NAME'].PolicyName" --output text)

if [ -n "$ATTACHED" ]; then
  echo "[OK] Policy already attached to user"
else
  aws_bootstrap iam attach-user-policy \
    --user-name "$USER_NAME" \
    --policy-arn "$POLICY_ARN"
  echo "[OK] Attached policy to user"
fi

# Step 4: Create or rotate access keys
echo "[KEYS] Checking access keys..."
EXISTING_KEYS=$(aws_bootstrap iam list-access-keys --user-name "$USER_NAME" --query 'AccessKeyMetadata[].AccessKeyId' --output text)

if [ -z "$EXISTING_KEYS" ]; then
  echo "Creating new access key..."
  ACCESS_KEY_OUTPUT=$(aws_bootstrap iam create-access-key --user-name "$USER_NAME")
else
  echo "[WARN] User already has access key(s): $EXISTING_KEYS"
  echo "Deleting old keys and creating new one..."
  for key_id in $EXISTING_KEYS; do
    aws_bootstrap iam delete-access-key --user-name "$USER_NAME" --access-key-id "$key_id"
    echo "  Deleted $key_id"
  done
  ACCESS_KEY_OUTPUT=$(aws_bootstrap iam create-access-key --user-name "$USER_NAME")
fi

# Step 5: Extract and save credentials
ACCESS_KEY_ID=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_OUTPUT" | jq -r '.AccessKey.SecretAccessKey')

# Upsert [terraform] block in ~/.aws/credentials without touching other profiles
upsert_aws_credentials() {
  local creds_file="$HOME/.aws/credentials"
  mkdir -p "$HOME/.aws"
  touch "$creds_file"
  chmod 600 "$creds_file"

  if grep -q '^\[terraform\]' "$creds_file"; then
    awk '/^\[terraform\]/{found=1; next} found && /^\[/{found=0} !found' "$creds_file" > /tmp/aws-creds-tmp
    mv /tmp/aws-creds-tmp "$creds_file"
    echo "[UPDATE] Replaced existing [terraform] profile in credentials"
  fi

  printf '\n[terraform]\naws_access_key_id = %s\naws_secret_access_key = %s\n' \
    "$ACCESS_KEY_ID" "$SECRET_ACCESS_KEY" >> "$creds_file"
}

# Upsert [profile terraform] block in ~/.aws/config
upsert_aws_config() {
  local config_file="$HOME/.aws/config"
  mkdir -p "$HOME/.aws"
  touch "$config_file"

  if grep -q '^\[profile terraform\]' "$config_file"; then
    awk '/^\[profile terraform\]/{found=1; next} found && /^\[/{found=0} !found' "$config_file" > /tmp/aws-config-tmp
    mv /tmp/aws-config-tmp "$config_file"
    echo "[UPDATE] Replaced existing [profile terraform] in config"
  fi

  printf '\n[profile terraform]\nregion = %s\n' "$AWS_REGION" >> "$config_file"
}

echo "[SAVE] Saving credentials to ~/.aws/credentials and ~/.aws/config..."
upsert_aws_credentials
upsert_aws_config

echo ""
echo "[DONE] Setup complete!"
echo ""
echo "  [terraform] profile written to ~/.aws/credentials"
echo "  [profile terraform] region written to ~/.aws/config"
echo ""
echo "  The pnpm tf:* scripts will automatically use AWS_PROFILE=terraform."
echo "  Run: pnpm run tf:plan  or  pnpm run tf:apply"

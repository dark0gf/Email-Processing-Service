# Email Processing Service (Interview Challenge)

A working demo of an inbound email pipeline that classifies emails and runs business logic:

- Supplier file emails: detect and store valid `.xlsx` supplier files
- Deal question emails: detect customer-service/deal questions and notify admin

This project is built as a hybrid architecture:

- AWS: SES inbound, S3, SQS, IAM, optional RDS
- Self-hosted/local app: NestJS backend poller and API, optional React frontend

## What this implements

### 1) Email receiving

Inbound flow:

1. Email arrives to SES inbox (for example `stage-inbox@dark.dedyn.io`)
2. SES stores raw email in S3 bucket (`raw/` prefix)
3. S3 event is pushed to SQS
4. Backend poller reads SQS, downloads raw email from S3, parses it, and processes it

### 2) Business logic

#### Supplier file detected

An attachment is treated as a supplier file when:

- It is `.xlsx`
- At least one sheet matches supplier file shape
- Required fields are present (column names may vary):
  - Brand
  - Model Code
  - Color
  - Size
  - RRP

Behavior:

- File is saved to S3
- Metadata is stored (filename, matched sheet, column mapping, row count, preview rows)

Reference spec: see `SUPPLIER_FILE.md`.

#### Deal question detected

An email is treated as a deal/customer-service question when classified as such by:

- Deterministic keyword check (fast path)
- OpenRouter fallback score (0..1), threshold `>= 0.5`

Behavior:

- Admin notification email is sent via SES
- Question record is stored (sender, subject, body, notification status)

### 3) Infrastructure

Terraform is used for AWS infrastructure in `terraform/`.

Managed by Terraform in this repo:

- SES receipt rule set and rules
- S3 inbound bucket
- SQS queue and permissions
- IAM resources
- Other AWS resources defined in `terraform/*.tf`

Manual step in this setup:

- DNS records in deSEC (domain is not in Route53)

### Infrastructure helper scripts

- `scripts/setup-terraform-iam.sh`
  - One-time helper to create/configure IAM credentials for Terraform usage.
  - Typical use when `terraform` AWS profile is missing.
  - Example:

```bash
AWS_PROFILE=default ./scripts/setup-terraform-iam.sh
```

- `scripts/load-terraform-env.sh`
  - Wrapper used by pnpm `tf:*` scripts.
  - Loads variables from `.env`, enforces `AWS_PROFILE=terraform`, and runs `terraform -chdir=terraform ...`.
  - Example direct use:

```bash
bash ./scripts/load-terraform-env.sh plan
bash ./scripts/load-terraform-env.sh apply
```

If you see an error that `terraform` profile is missing, run `setup-terraform-iam.sh` first.

- `scripts/send-test-email.ts`
  - Helper script to send test emails to `RECEIPT_EMAIL` through SES.
  - Supports plain emails and file attachments (including `.xlsx`) to test routing logic.
  - Exposed via root script: `pnpm run send-test-email <subject> <body> [attachmentPaths]`

Examples:

```bash
# Simple email
pnpm run send-test-email  "Deal status question" "Hi, can you share delivery ETA?"

# Supplier-file style email with xlsx attachment
pnpm run send-test-email \
  "New supplier file" \
  "Please find attached price list" \
  "Supplier file 1.xlsx"
```

## Deliverables mapping

From the challenge requirements:

- Email address to test: provided by `RECEIPT_EMAIL` in environment (stage example: `stage-inbox@dark.dedyn.io`)
- Behavior per email type: documented above
- Product decisions: documented in this README (classification approach, storage, notification)

## Requirements

- Node.js
- pnpm
- Terraform
- AWS account and credentials
- Domain DNS access (for SES verification records)

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create environment file from example:

```bash
cp .env.example .env
```

3. Fill required env vars in `.env`:

- `AWS_REGION`
- `RAW_EMAIL_BUCKET`
- `SQS_QUEUE_URL`
- `RECEIPT_EMAIL`
- `ADMIN_EMAIL`
- `SES_FROM_EMAIL`
- `DATABASE_URL`
- `OPENROUTER_API_KEY`
- auth and JWT variables

## AWS credentials and Terraform

If your AWS session expires, refresh before Terraform/app operations:

```bash
aws login
aws sts get-caller-identity
```

If you use the local Terraform IAM helper:

```bash
AWS_PROFILE=default ./scripts/setup-terraform-iam.sh
```

Terraform commands:

```bash
pnpm run tf:init
pnpm run tf:fmt
pnpm run tf:validate
pnpm run tf:plan
pnpm run tf:apply
```

## Run locally

Backend:

```bash
pnpm run backend:dev
```

Frontend (optional):

```bash
pnpm run frontend:dev
```

## How to test end-to-end

1. Ensure SES receipt rule set is active and points to your S3/SQS pipeline.
2. Send a real email to `RECEIPT_EMAIL` (for stage: `stage-inbox@dark.dedyn.io`).
3. Verify raw email appears in S3 `raw/`.
4. Verify SQS receives event message.
5. Confirm backend processed the email.

Useful checks:

```bash
aws ses describe-active-receipt-rule-set --region eu-west-1

aws sqs receive-message \
  --queue-url $(aws sqs get-queue-url --queue-name stage-supplier-email-inbound --query QueueUrl --output text) \
  --region eu-west-1

aws s3 ls s3://stage-bucket-inbound/raw/ --region eu-west-1
```

## API endpoints (backend)

- `GET /health`
- `GET /emails`
- `GET /emails/:id`
- `POST /emails/process` (manual processing test)
- `GET /supplier-files`
- `GET /deal-questions`
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`

## Product decisions

- Classification strategy:
  - Supplier files: deterministic header aliases first, OpenRouter mapping fallback
  - Deal questions: keyword hits first, OpenRouter scoring fallback
- Storage strategy:
  - Raw emails in S3
  - Supplier files in S3 + metadata store
  - Deal questions in store + SES notification status
- Reliability:
  - Idempotency by message-id check before processing

## Security notes

- Do not commit real secrets in docs or code.
- Keep OpenRouter and AWS credentials in `.env` only.
- Rotate credentials if they were exposed.

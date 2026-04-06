# Interview Challenge: Email Processing Service

## Context

We run a platform that manages product data from suppliers. Suppliers and partners communicate with us via email — sometimes sending product files, sometimes asking questions about deals.

We want to automate this: an email service that receives emails and routes them based on their content.

## Goal

Create a **working demo service** on a real AWS account that receives emails and performs business logic based on their content.

**AWS costs will be < $10 and will be refunded.**

## Requirements

### 1. Email Receiving

Set up an email address that can receive real emails. When an email arrives, the service should process it automatically.

### 2. Business Logic

Based on the content of the received email:

1. **Supplier file detected** — If the email contains an Excel attachment (.xlsx) and any of its sheets matches the structure of a supplier file (see [SUPPLIER_FILE.md](./SUPPLIER_FILE.md)), save the file. You decide where and how.

2. **Deal question detected** — If the email contains customer service related question, notify an admin user via email. Store any information you think is relevant.

### 3. Infrastructure

The solution will be a **hybrid architecture** — some parts running on AWS and some parts self-hosted locally. Use whatever split makes sense to you.

Use Terraform to provision the AWS resources you need. The `terraform/` folder is there for this purpose.
You can use Claude Code to generate changes, then run `terraform plan` and `terraform apply`.
The resources you need to apply will cost you most likely well under 1$, we will refund up to 10$. Be responsible your decisions.

## Provided

- An **OpenRouter API key** will be provided for AI/LLM usage (email classification, column mapping, etc.)

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
(5$ uploaded, will expire tomorrow)



## Constraints

- Use **TypeScript** for application code
- Use **Terraform** for infrastructure
- Use a real **AWS account** (costs will be reimbursed)
- Use the provided **OpenRouter API key** for any AI/LLM calls
- Make it deployable and testable by sending a real email

We'd rather see something small that works than something ambitious that doesn't.

## What we're looking for

- **Working software** — we should be able to send an email and see the correct behavior happen
- **Product decisions** — how do you classify the email? Where do you store the file? What info do you save for deal questions? What does the admin notification look like? Make these choices deliberately.
- **Clear code** — we'll read it together in a follow-up call

## What we're NOT looking for

- Polished UI
- Production-grade error handling
- Perfect email parsing for every edge case

## Deliverables

- A git repo with your code
- A README that explains:
  - The email address to send test emails to
  - What happens for each email type
  - Any decisions you made and why

## Reference

- [SUPPLIER_FILE.md](./SUPPLIER_FILE.md) — describes what a supplier file looks like and how to recognize one

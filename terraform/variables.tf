variable "project_name" {
  description = "Prefix used for AWS resource names."
  type        = string
  default     = "supplier-email"
}

variable "aws_region" {
  description = "AWS region for SES/S3/SQS resources."
  type        = string
  default     = "eu-west-1"
}

variable "domain_name" {
  description = "Domain used by SES for receiving/sending."
  type        = string
}

variable "admin_email" {
  description = "Admin email used by application notifications."
  type        = string
}

variable "environment" {
  description = "Logical environment name (e.g. stage, prod)."
  type        = string
}

variable "receipt_local_part" {
  description = "Local part of the SES receipt email address. Defaults to inbox-<environment>."
  type        = string
  default     = null
}

variable "bucket_name" {
  description = "S3 bucket name for inbound emails. Defaults to dark-dedyn-io-inbound-<environment>."
  type        = string
  default     = null
}

variable "queue_name" {
  description = "SQS queue name for inbound email events. Defaults to supplier-email-inbound-<environment>."
  type        = string
  default     = null
}

variable "rule_set_name" {
  description = "SES receipt rule set name."
  type        = string
  default     = "supplier-email-inbound"
}

variable "activate_rule_set" {
  description = "Whether this stack should set the receipt rule set as active."
  type        = bool
  default     = true
}

variable "manage_ses_identity" {
  description = "Create SES domain identity and DKIM records from Terraform. Disable if identity already exists."
  type        = bool
  default     = false
}

variable "db_allowed_cidrs" {
  description = "CIDR ranges allowed to connect to PostgreSQL on RDS."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  description = "Common tags attached to resources."
  type        = map(string)
  default     = {}
}

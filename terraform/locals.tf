data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id

  receipt_local_part = coalesce(var.receipt_local_part, "inbox-${var.environment}")
  bucket_name        = coalesce(var.bucket_name, "dark-dedyn-io-inbound-${var.environment}")
  queue_name         = coalesce(var.queue_name, "supplier-email-inbound-${var.environment}")

  envs = {
    (var.environment) = {
      receipt_local_part = local.receipt_local_part
      bucket_name        = local.bucket_name
      queue_name         = local.queue_name
      receipt_email      = "${local.receipt_local_part}@${var.domain_name}"
    }
  }
}

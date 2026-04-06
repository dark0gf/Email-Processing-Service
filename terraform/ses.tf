resource "aws_ses_domain_identity" "domain" {
  count  = var.manage_ses_identity ? 1 : 0
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "domain" {
  count  = var.manage_ses_identity ? 1 : 0
  domain = aws_ses_domain_identity.domain[0].domain
}

resource "aws_ses_receipt_rule_set" "inbound" {
  rule_set_name = var.rule_set_name
}

resource "aws_ses_active_receipt_rule_set" "inbound" {
  count = var.activate_rule_set ? 1 : 0

  rule_set_name = aws_ses_receipt_rule_set.inbound.rule_set_name
}

resource "aws_ses_receipt_rule" "inbound" {
  for_each = local.envs

  name          = "${var.project_name}-${each.key}-store-raw"
  rule_set_name = aws_ses_receipt_rule_set.inbound.rule_set_name
  enabled       = true
  scan_enabled  = true
  tls_policy    = "Optional"
  recipients    = [each.value.receipt_email]

  s3_action {
    position          = 1
    bucket_name       = aws_s3_bucket.inbound[each.key].bucket
    object_key_prefix = "raw/"
  }

  depends_on = [aws_s3_bucket_policy.inbound]
}

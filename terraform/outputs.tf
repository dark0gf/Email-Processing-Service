output "inbox_addresses" {
  description = "Inbound email addresses configured by SES receipt rules."
  value       = { for env, cfg in local.envs : env => cfg.receipt_email }
}

output "s3_buckets" {
  description = "Inbound S3 buckets per environment."
  value       = { for env, bucket in aws_s3_bucket.inbound : env => bucket.bucket }
}

output "sqs_queue_urls" {
  description = "Inbound SQS queue URLs per environment."
  value       = { for env, queue in aws_sqs_queue.inbound : env => queue.id }
}

output "ses_inbound_mx_record" {
  description = "MX target to add in external DNS for SES inbound receiving."
  value = {
    name     = var.domain_name
    priority = 10
    value    = "inbound-smtp.${var.aws_region}.amazonaws.com"
  }
}

output "ses_verification_txt_record" {
  description = "TXT verification record when manage_ses_identity=true."
  value = var.manage_ses_identity ? {
    name  = "_amazonses.${var.domain_name}"
    value = aws_ses_domain_identity.domain[0].verification_token
  } : null
}

output "ses_dkim_cname_records" {
  description = "DKIM CNAME records when manage_ses_identity=true."
  value = var.manage_ses_identity ? [
    for token in aws_ses_domain_dkim.domain[0].dkim_tokens : {
      name  = "${token}._domainkey.${var.domain_name}"
      value = "${token}.dkim.amazonses.com"
    }
  ] : []
}

output "rds_endpoint" {
  description = "RDS PostgreSQL database endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_database_name" {
  description = "RDS PostgreSQL database name"
  value       = aws_db_instance.main.db_name
}

output "rds_username" {
  description = "RDS PostgreSQL master username"
  value       = aws_db_instance.main.username
}

output "database_url" {
  description = "Complete database URL for connection string"
  value       = "postgresql://dbadmin:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
  sensitive   = true
}

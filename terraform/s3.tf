resource "aws_s3_bucket" "inbound" {
  for_each = local.envs

  bucket        = each.value.bucket_name
  force_destroy = true

  tags = merge(var.tags, {
    Project     = var.project_name
    Environment = each.key
    Purpose     = "ses-inbound"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "inbound" {
  for_each = local.envs

  bucket = aws_s3_bucket.inbound[each.key].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "inbound" {
  for_each = local.envs

  bucket = aws_s3_bucket.inbound[each.key].id

  versioning_configuration {
    status = "Enabled"
  }
}

data "aws_iam_policy_document" "ses_put_to_s3" {
  for_each = local.envs

  statement {
    sid = "AllowSesPutObject"

    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    actions = ["s3:PutObject"]

    resources = ["${aws_s3_bucket.inbound[each.key].arn}/raw/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceAccount"
      values   = [local.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "AWS:SourceArn"
      values = [
        "arn:aws:ses:${var.aws_region}:${local.account_id}:receipt-rule-set/${var.rule_set_name}:receipt-rule/*"
      ]
    }
  }
}

resource "aws_s3_bucket_policy" "inbound" {
  for_each = local.envs

  bucket = aws_s3_bucket.inbound[each.key].id
  policy = data.aws_iam_policy_document.ses_put_to_s3[each.key].json
}

resource "aws_s3_bucket_notification" "raw_to_sqs" {
  for_each = local.envs

  bucket = aws_s3_bucket.inbound[each.key].id

  queue {
    queue_arn     = aws_sqs_queue.inbound[each.key].arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "raw/"
  }

  depends_on = [aws_sqs_queue_policy.allow_s3_events]
}

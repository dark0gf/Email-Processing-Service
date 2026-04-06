resource "aws_sqs_queue" "inbound" {
  for_each = local.envs

  name                       = each.value.queue_name
  visibility_timeout_seconds = 120
  message_retention_seconds  = 345600

  tags = merge(var.tags, {
    Project     = var.project_name
    Environment = each.key
    Purpose     = "ses-inbound-events"
  })
}

data "aws_iam_policy_document" "allow_s3_to_send_sqs" {
  for_each = local.envs

  statement {
    sid    = "AllowS3SendMessage"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }

    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.inbound[each.key].arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_s3_bucket.inbound[each.key].arn]
    }
  }
}

resource "aws_sqs_queue_policy" "allow_s3_events" {
  for_each = local.envs

  queue_url = aws_sqs_queue.inbound[each.key].id
  policy    = data.aws_iam_policy_document.allow_s3_to_send_sqs[each.key].json
}

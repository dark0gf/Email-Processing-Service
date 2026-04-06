resource "aws_iam_user" "app" {
  name = "${var.project_name}-app"

  tags = merge(var.tags, {
    Project = var.project_name
    Purpose = "backend-processor"
  })
}

data "aws_iam_policy_document" "app" {
  statement {
    sid    = "ReadWriteInboundBuckets"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket"
    ]
    resources = concat(
      [for bucket in aws_s3_bucket.inbound : bucket.arn],
      [for bucket in aws_s3_bucket.inbound : "${bucket.arn}/*"]
    )
  }

  statement {
    sid    = "ConsumeInboundQueue"
    effect = "Allow"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
      "sqs:ChangeMessageVisibility"
    ]
    resources = [for queue in aws_sqs_queue.inbound : queue.arn]
  }

  statement {
    sid    = "SendNotificationsViaSes"
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "app" {
  name   = "${var.project_name}-app-policy"
  policy = data.aws_iam_policy_document.app.json
}

resource "aws_iam_user_policy_attachment" "app" {
  user       = aws_iam_user.app.name
  policy_arn = aws_iam_policy.app.arn
}

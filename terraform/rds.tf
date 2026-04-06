resource "random_password" "db_password" {
  length  = 32
  special = true
}

data "aws_vpc" "default" {
  default = true
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-${var.environment}"
  description = "Allow PostgreSQL access to RDS"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "PostgreSQL"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.db_allowed_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project_name}-rds-${var.environment}" })
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-db-${var.environment}"
  engine         = "postgres"
  engine_version = "15.17"
  instance_class = "db.t4g.micro"

  allocated_storage     = 20
  max_allocated_storage = 100

  db_name  = replace("${var.project_name}_${var.environment}", "-", "_")
  username = "dbadmin"
  password = random_password.db_password.result
  port     = 5432
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = true
  skip_final_snapshot = var.environment != "prod"

  backup_retention_period = var.environment == "prod" ? 30 : 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  storage_encrypted = true

  tags = merge(var.tags, { Name = "${var.project_name}-db-${var.environment}" })
}

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project_name}/db-password/${var.environment}"
  recovery_window_in_days = 0

  tags = merge(var.tags, { Name = "${var.project_name}-db-password" })
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

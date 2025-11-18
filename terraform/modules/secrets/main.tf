# Secrets Manager Module - Credentials and Configuration Storage

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Generate random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Generate random auth token for Redis
resource "random_password" "redis_auth_token" {
  length  = 32
  special = false  # Redis auth tokens can't have special characters
}

# Database password secret
resource "aws_secretsmanager_secret" "db_password" {
  name_prefix = "${var.name_prefix}/db/password-"
  description = "Database master password for ${var.name_prefix}"

  tags = merge(
    var.common_tags,
    {
      Name = "${var.name_prefix}-db-password"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id       = aws_secretsmanager_secret.db_password.id
  secret_string   = random_password.db_password.result
}

# Redis auth token secret
resource "aws_secretsmanager_secret" "redis_auth_token" {
  name_prefix = "${var.name_prefix}/redis/auth-token-"
  description = "Redis AUTH token for ${var.name_prefix}"

  tags = merge(
    var.common_tags,
    {
      Name = "${var.name_prefix}-redis-auth-token"
    }
  )
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  secret_id       = aws_secretsmanager_secret.redis_auth_token.id
  secret_string   = random_password.redis_auth_token.result
}

# Automatic password rotation for database (optional)
resource "aws_secretsmanager_secret_rotation" "db_password" {
  count               = var.enable_rotation ? 1 : 0
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_rules {
    automatically_after_days = 30
  }
}

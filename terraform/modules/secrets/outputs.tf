# Secrets Manager Module Outputs

output "db_password_secret_id" {
  value       = aws_secretsmanager_secret.db_password.id
  description = "Database password secret ID"
}

output "redis_auth_token_secret_id" {
  value       = aws_secretsmanager_secret.redis_auth_token.id
  description = "Redis auth token secret ID"
}

output "db_password_secret_arn" {
  value = aws_secretsmanager_secret.db_password.arn
}

output "redis_auth_token_secret_arn" {
  value = aws_secretsmanager_secret.redis_auth_token.arn
}

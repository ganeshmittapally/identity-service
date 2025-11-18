# ElastiCache Module - Redis Cache
# Stub file

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

output "redis_endpoint" {
  value = "redis-endpoint-placeholder"
}

output "redis_port" {
  value = 6379
}

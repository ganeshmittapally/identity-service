# ECS Module - Container Orchestration
# Stub file - expand with full ECS configuration

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

output "cluster_name" {
  value = "ecs-cluster-placeholder"
}

output "backend_service_name" {
  value = "backend-service-placeholder"
}

output "frontend_service_name" {
  value = "frontend-service-placeholder"
}

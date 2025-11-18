# Global Variables

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "identity-service"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "IdentityService"
}

# VPC Configuration

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "database_subnets" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.20.0/24", "10.0.21.0/24"]
}

# ECS Configuration

variable "ecs_cpu" {
  description = "CPU units for ECS tasks"
  type        = string
  default     = "512"
}

variable "ecs_memory" {
  description = "Memory in MB for ECS tasks"
  type        = string
  default     = "1024"
}

variable "ecs_desired_count" {
  description = "Desired number of ECS task replicas"
  type        = number
  default     = 2
}

variable "ecs_min_capacity" {
  description = "Minimum number of ECS task replicas"
  type        = number
  default     = 2
}

variable "ecs_max_capacity" {
  description = "Maximum number of ECS task replicas"
  type        = number
  default     = 4
}

variable "backend_image_url" {
  description = "Docker image URL for backend service"
  type        = string
  # Should be provided at runtime or in tfvars
}

variable "frontend_image_url" {
  description = "Docker image URL for frontend service"
  type        = string
  # Should be provided at runtime or in tfvars
}

variable "container_port" {
  description = "Port exposed by container"
  type        = number
  default     = 3000
}

# RDS Configuration

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.medium"
}

variable "rds_allocated_storage" {
  description = "Allocated storage in GB for RDS"
  type        = number
  default     = 100
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "14.9"
}

variable "rds_backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = true
}

variable "database_name" {
  description = "Name of the default database"
  type        = string
  default     = "identitydb"
}

variable "database_username" {
  description = "Master username for database"
  type        = string
  default     = "postgres"
  sensitive   = true
}

# ElastiCache Configuration

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in cluster"
  type        = number
  default     = 2
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "redis_automatic_failover" {
  description = "Enable automatic failover"
  type        = bool
  default     = true
}

# ALB Configuration

variable "alb_health_check_path" {
  description = "Health check path for ALB"
  type        = string
  default     = "/health"
}

variable "alb_health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 30
}

variable "alb_health_check_timeout" {
  description = "Health check timeout in seconds"
  type        = number
  default     = 5
}

variable "alb_health_check_healthy_threshold" {
  description = "Number of consecutive health checks required to mark target healthy"
  type        = number
  default     = 2
}

variable "alb_health_check_unhealthy_threshold" {
  description = "Number of consecutive health checks required to mark target unhealthy"
  type        = number
  default     = 3
}

# Certificate Configuration

variable "certificate_arn" {
  description = "ARN of SSL/TLS certificate in ACM"
  type        = string
  # Should be provided at runtime or in tfvars
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  # Should be provided at runtime or in tfvars
}

# Monitoring Configuration

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring for RDS"
  type        = bool
  default     = true
}

variable "enable_performance_insights" {
  description = "Enable Performance Insights for RDS"
  type        = bool
  default     = false
}

# Tagging

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Owner      = "DevOps"
    CostCenter = "Engineering"
  }
}

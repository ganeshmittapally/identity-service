# Local values for common configurations

locals {
  # Environment-specific naming
  name_prefix = "${var.project_name}-${var.environment}"
  
  # Common tags applied to all resources
  common_tags = merge(
    var.common_tags,
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
      CreatedDate = timestamp()
    }
  )

  # Service names
  backend_service_name  = "${local.name_prefix}-backend"
  frontend_service_name = "${local.name_prefix}-frontend"
  
  # Database configuration
  db_name = replace(var.database_name, "-", "")
  
  # Auto-scaling configuration
  target_cpu_utilization    = 70
  target_memory_utilization = 80
  
  # Log retention based on environment
  log_retention = var.environment == "production" ? 90 : 30
  
  # RDS backup retention based on environment
  backup_retention = var.environment == "production" ? 30 : 7
  
  # Monitoring configuration
  enable_detailed_monitoring = var.environment == "production" ? true : false
  
  # Performance tuning based on environment
  ecs_cpu_reservation    = var.environment == "production" ? 512 : 256
  ecs_memory_reservation = var.environment == "production" ? 1024 : 512
}

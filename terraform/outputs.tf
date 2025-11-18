# Main Outputs

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = module.alb.alb_arn
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_backend_service_name" {
  description = "Name of the backend ECS service"
  value       = module.ecs.backend_service_name
}

output "ecs_frontend_service_name" {
  description = "Name of the frontend ECS service"
  value       = module.ecs.frontend_service_name
}

output "rds_endpoint" {
  description = "RDS database endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "rds_database_name" {
  description = "Name of the RDS database"
  value       = module.rds.db_name
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.elasticache.redis_endpoint
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = module.elasticache.redis_port
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = try(module.cloudfront.distribution_domain_name, "Not configured")
}

output "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = try(module.route53.zone_id, "Not configured")
}

output "iam_backend_task_role_arn" {
  description = "ARN of the backend ECS task role"
  value       = module.iam.backend_task_role_arn
}

output "secrets_manager_db_secret_id" {
  description = "ID of the database credentials secret"
  value       = module.secrets.db_secret_id
}

output "s3_logs_bucket_name" {
  description = "Name of the S3 logs bucket"
  value       = module.s3.logs_bucket_name
}

output "cloudwatch_backend_log_group" {
  description = "CloudWatch log group for backend service"
  value       = module.cloudwatch.backend_log_group_name
}

output "cloudwatch_frontend_log_group" {
  description = "CloudWatch log group for frontend service"
  value       = module.cloudwatch.frontend_log_group_name
}

# Connection Information

output "application_url" {
  description = "URL to access the application"
  value       = "https://${var.domain_name}"
}

output "api_endpoint" {
  description = "API endpoint URL"
  value       = "https://${var.domain_name}/api"
}

output "deployment_info" {
  description = "Summary of deployment information"
  value = {
    environment         = var.environment
    region              = var.aws_region
    vpc_id              = module.vpc.vpc_id
    alb_dns             = module.alb.alb_dns_name
    ecs_cluster         = module.ecs.cluster_name
    database_endpoint   = "See output: rds_endpoint"
    redis_endpoint      = "See output: redis_endpoint"
    cloudfront_domain   = try(module.cloudfront.distribution_domain_name, "Not configured")
  }
}

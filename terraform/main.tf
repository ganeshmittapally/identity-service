# Main Terraform Configuration - Module Instantiation

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  name_prefix        = local.name_prefix
  vpc_cidr          = var.vpc_cidr
  availability_zones = var.availability_zones
  public_subnets    = var.public_subnets
  private_subnets   = var.private_subnets
  database_subnets  = var.database_subnets
  enable_flow_logs  = var.environment == "production" ? true : false
  common_tags       = local.common_tags
}

# ALB Module (placeholder for now - will expand)
module "alb" {
  source = "./modules/alb"

  name_prefix        = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  
  certificate_arn   = var.certificate_arn
  health_check_path = var.alb_health_check_path
  health_check_interval = var.alb_health_check_interval
  health_check_timeout = var.alb_health_check_timeout
  health_check_healthy_threshold = var.alb_health_check_healthy_threshold
  health_check_unhealthy_threshold = var.alb_health_check_unhealthy_threshold
  
  common_tags       = local.common_tags
}

# Security Group for ALB
module "alb_security_group" {
  source = "./modules/security-groups"
  
  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  description = "Security group for Application Load Balancer"
  
  ingress_rules = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Allow HTTP"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Allow HTTPS"
    }
  ]
  
  egress_rules = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Allow all outbound"
    }
  ]
  
  common_tags = local.common_tags
}

# Security Group for ECS
module "ecs_security_group" {
  source = "./modules/security-groups"
  
  name_prefix = "${local.name_prefix}-ecs"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for ECS tasks"
  
  ingress_rules = [
    {
      from_port       = 3000
      to_port         = 3000
      protocol        = "tcp"
      security_groups = [module.alb_security_group.security_group_id]
      description     = "Allow from ALB"
    }
  ]
  
  egress_rules = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = ["0.0.0.0/0"]
      description = "Allow all outbound"
    }
  ]
  
  common_tags = local.common_tags
}

# Security Group for RDS
module "rds_security_group" {
  source = "./modules/security-groups"
  
  name_prefix = "${local.name_prefix}-rds"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for RDS database"
  
  ingress_rules = [
    {
      from_port       = 5432
      to_port         = 5432
      protocol        = "tcp"
      security_groups = [module.ecs_security_group.security_group_id]
      description     = "Allow from ECS"
    }
  ]
  
  egress_rules = []
  
  common_tags = local.common_tags
}

# Security Group for Redis
module "redis_security_group" {
  source = "./modules/security-groups"
  
  name_prefix = "${local.name_prefix}-redis"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for ElastiCache Redis"
  
  ingress_rules = [
    {
      from_port       = 6379
      to_port         = 6379
      protocol        = "tcp"
      security_groups = [module.ecs_security_group.security_group_id]
      description     = "Allow from ECS"
    }
  ]
  
  egress_rules = []
  
  common_tags = local.common_tags
}

# IAM Module
module "iam" {
  source = "./modules/iam"
  
  name_prefix = local.name_prefix
  common_tags = local.common_tags
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"
  
  name_prefix = local.name_prefix
  environment = var.environment
  common_tags = local.common_tags
}

# RDS Module
module "rds" {
  source = "./modules/rds"
  
  name_prefix              = local.name_prefix
  vpc_id                  = module.vpc.vpc_id
  database_subnet_ids     = module.vpc.database_subnet_ids
  security_group_ids      = [module.rds_security_group.security_group_id]
  
  instance_class          = var.rds_instance_class
  allocated_storage       = var.rds_allocated_storage
  engine_version          = var.rds_engine_version
  backup_retention_days   = local.backup_retention
  multi_az                = var.rds_multi_az
  
  database_name           = local.db_name
  master_username         = var.database_username
  master_password_secret_id = module.secrets.db_password_secret_id
  
  enable_enhanced_monitoring = local.enable_detailed_monitoring
  enable_performance_insights = var.enable_performance_insights
  
  task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  
  common_tags             = local.common_tags
  
  depends_on = [module.vpc]
}

# ElastiCache Redis
module "elasticache" {
  source = "./modules/elasticache"
  
  name_prefix          = local.name_prefix
  vpc_id              = module.vpc.vpc_id
  database_subnet_ids = module.vpc.database_subnet_ids
  security_group_ids  = [module.redis_security_group.security_group_id]
  
  node_type           = var.redis_node_type
  num_cache_nodes     = var.redis_num_cache_nodes
  engine_version      = var.redis_engine_version
  automatic_failover  = var.redis_automatic_failover
  
  auth_token_secret_id = module.secrets.redis_auth_token_secret_id
  
  common_tags         = local.common_tags
  
  depends_on = [module.vpc]
}

# CloudWatch Module
module "cloudwatch" {
  source = "./modules/cloudwatch"
  
  name_prefix        = local.name_prefix
  log_retention_days = local.log_retention
  
  backend_log_group_name  = "/ecs/${local.backend_service_name}"
  frontend_log_group_name = "/ecs/${local.frontend_service_name}"
  
  common_tags = local.common_tags
}

# ECS Module
module "ecs" {
  source = "./modules/ecs"
  
  name_prefix = local.name_prefix
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  
  # Networking
  private_subnet_ids     = module.vpc.private_subnet_ids
  security_group_ids     = [module.ecs_security_group.security_group_id]
  alb_target_group_arn   = module.alb.target_group_arn
  
  # Container images
  backend_image_url  = var.backend_image_url
  frontend_image_url = var.frontend_image_url
  
  # Resource allocation
  backend_cpu           = var.ecs_cpu
  backend_memory        = var.ecs_memory
  frontend_cpu          = "256"
  frontend_memory       = "512"
  
  # Service scaling
  desired_count   = var.ecs_desired_count
  min_capacity    = var.ecs_min_capacity
  max_capacity    = var.ecs_max_capacity
  
  # Monitoring and logging
  backend_log_group   = module.cloudwatch.backend_log_group_name
  frontend_log_group  = module.cloudwatch.frontend_log_group_name
  
  # IAM roles
  task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  task_role_arn          = module.iam.backend_task_role_arn
  
  # Application environment
  database_url = "postgresql://${var.database_username}:${module.secrets.db_password_secret_id}@${module.rds.db_instance_endpoint}"
  redis_url    = "${module.elasticache.redis_endpoint}:${module.elasticache.redis_port}"
  environment  = var.environment
  
  common_tags = local.common_tags
  
  depends_on = [
    module.rds,
    module.elasticache,
    module.cloudwatch,
    module.iam
  ]
}

# S3 Module
module "s3" {
  source = "./modules/s3"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  create_logs_bucket    = true
  create_assets_bucket  = var.environment == "production" ? true : false
  
  common_tags = local.common_tags
}

# CloudFront (optional, only for production)
module "cloudfront" {
  count  = var.environment == "production" ? 1 : 0
  source = "./modules/cloudfront"
  
  name_prefix     = local.name_prefix
  alb_domain_name = module.alb.alb_dns_name
  certificate_arn = var.certificate_arn
  domain_name     = var.domain_name
  
  common_tags = local.common_tags
}

# Route 53 (optional)
module "route53" {
  count  = try(var.domain_name, null) != null ? 1 : 0
  source = "./modules/route53"
  
  domain_name         = var.domain_name
  alb_dns_name        = module.alb.alb_dns_name
  cloudfront_domain   = try(module.cloudfront[0].distribution_domain_name, null)
  
  common_tags = local.common_tags
}

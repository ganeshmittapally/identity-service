# ECS Module Variables

variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "alb_target_group_arn" { type = string }
variable "backend_image_url" { type = string }
variable "frontend_image_url" { type = string }
variable "backend_cpu" { type = string }
variable "backend_memory" { type = string }
variable "frontend_cpu" { type = string }
variable "frontend_memory" { type = string }
variable "desired_count" { type = number }
variable "min_capacity" { type = number }
variable "max_capacity" { type = number }
variable "backend_log_group" { type = string }
variable "frontend_log_group" { type = string }
variable "task_execution_role_arn" { type = string }
variable "task_role_arn" { type = string }
variable "database_url" { type = string }
variable "redis_url" { type = string }
variable "environment_vars" { type = map(string); default = {} }
variable "common_tags" { type = map(string) }

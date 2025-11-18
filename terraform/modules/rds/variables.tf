# RDS Module Variables

variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "database_subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "instance_class" { type = string }
variable "allocated_storage" { type = number }
variable "engine_version" { type = string }
variable "backup_retention_days" { type = number }
variable "multi_az" { type = bool }
variable "database_name" { type = string }
variable "master_username" { type = string }
variable "master_password_secret_id" { type = string }
variable "enable_enhanced_monitoring" { type = bool }
variable "enable_performance_insights" { type = bool }
variable "task_execution_role_arn" { type = string }
variable "common_tags" { type = map(string) }

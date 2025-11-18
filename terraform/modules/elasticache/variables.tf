# ElastiCache Module Variables

variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "database_subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "node_type" { type = string }
variable "num_cache_nodes" { type = number }
variable "engine_version" { type = string }
variable "automatic_failover" { type = bool }
variable "auth_token_secret_id" { type = string }
variable "common_tags" { type = map(string) }

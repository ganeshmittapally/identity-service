# S3 Module Variables

variable "name_prefix" { type = string }
variable "environment" { type = string }
variable "create_logs_bucket" { type = bool; default = true }
variable "create_assets_bucket" { type = bool; default = false }
variable "common_tags" { type = map(string) }

# CloudWatch Module Variables

variable "name_prefix" {
  type = string
}

variable "log_retention_days" {
  type = number
}

variable "backend_log_group_name" {
  type = string
}

variable "frontend_log_group_name" {
  type = string
}

variable "common_tags" {
  type = map(string)
}

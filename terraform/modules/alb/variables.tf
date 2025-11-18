# ALB Module Variables

variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "certificate_arn" {
  type = string
}

variable "health_check_path" {
  type = string
}

variable "health_check_interval" {
  type = number
}

variable "health_check_timeout" {
  type = number
}

variable "health_check_healthy_threshold" {
  type = number
}

variable "health_check_unhealthy_threshold" {
  type = number
}

variable "common_tags" {
  type = map(string)
}

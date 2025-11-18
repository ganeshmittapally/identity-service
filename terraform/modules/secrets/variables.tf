# Secrets Manager Module Variables

variable "name_prefix" {
  type = string
}

variable "environment" {
  type = string
}

variable "enable_rotation" {
  type    = bool
  default = false
}

variable "common_tags" {
  type = map(string)
}

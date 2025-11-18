# CloudFront Module Variables

variable "name_prefix" { type = string }
variable "alb_domain_name" { type = string }
variable "certificate_arn" { type = string }
variable "domain_name" { type = string }
variable "common_tags" { type = map(string) }

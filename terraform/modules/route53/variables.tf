# Route 53 Module Variables

variable "domain_name" { type = string }
variable "alb_dns_name" { type = string }
variable "cloudfront_domain" { type = optional(string) }
variable "common_tags" { type = map(string) }

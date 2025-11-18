# ALB Module - Application Load Balancer
# Stub file - expand with full ALB configuration as needed

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Placeholder outputs
output "alb_dns_name" {
  value = "alb-dns-placeholder"
}

output "alb_arn" {
  value = "alb-arn-placeholder"
}

output "target_group_arn" {
  value = "tg-arn-placeholder"
}

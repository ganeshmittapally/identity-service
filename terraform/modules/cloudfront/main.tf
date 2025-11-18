# CloudFront Module - CDN

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

output "distribution_domain_name" {
  value = "cloudfront-placeholder.cloudfront.net"
}

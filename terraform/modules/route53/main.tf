# Route 53 Module - DNS Management

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Placeholder for Route 53 zone and records

output "zone_id" {
  value = "zone-placeholder"
}

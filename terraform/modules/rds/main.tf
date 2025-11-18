# RDS Module - PostgreSQL Database
# Stub file - expand with full RDS configuration as needed

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

output "db_instance_endpoint" {
  value = "db-endpoint-placeholder:5432"
}

output "db_name" {
  value = "identitydb"
}

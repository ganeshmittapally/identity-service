# Production Environment Backend Configuration
# Stores Terraform state in S3 with DynamoDB locking

terraform {
  backend "s3" {
    bucket         = "identity-service-terraform-state-prod"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "identity-service-tf-locks-prod"
  }
}

# CloudWatch Module - Monitoring and Logging

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = var.backend_log_group_name
  retention_in_days = var.log_retention_days

  tags = merge(
    var.common_tags,
    {
      Name = "${var.name_prefix}-backend-logs"
    }
  )
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = var.frontend_log_group_name
  retention_in_days = var.log_retention_days

  tags = merge(
    var.common_tags,
    {
      Name = "${var.name_prefix}-frontend-logs"
    }
  )
}

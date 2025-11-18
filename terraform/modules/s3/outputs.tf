# S3 Module Outputs

output "logs_bucket_name" {
  value = try(aws_s3_bucket.logs[0].id, null)
}

output "logs_bucket_arn" {
  value = try(aws_s3_bucket.logs[0].arn, null)
}

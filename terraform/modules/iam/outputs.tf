# IAM Module Outputs

output "ecs_task_execution_role_arn" {
  description = "ECS Task Execution Role ARN"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_execution_role_name" {
  description = "ECS Task Execution Role Name"
  value       = aws_iam_role.ecs_task_execution_role.name
}

output "backend_task_role_arn" {
  description = "Backend ECS Task Role ARN"
  value       = aws_iam_role.ecs_task_role.arn
}

output "backend_task_role_name" {
  description = "Backend ECS Task Role Name"
  value       = aws_iam_role.ecs_task_role.name
}

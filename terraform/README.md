# Terraform Infrastructure as Code for Identity Service

This directory contains the complete Infrastructure as Code (IaC) for deploying the Identity Service on AWS using Terraform.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Deployment](#deployment)
- [Outputs](#outputs)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

This Terraform configuration provides production-grade infrastructure on AWS for the Identity Service, including:

- **Networking**: VPC with public/private subnets across 2 availability zones
- **Load Balancing**: Application Load Balancer with HTTPS
- **Container Orchestration**: ECS Fargate for backend and frontend services
- **Database**: RDS PostgreSQL with Multi-AZ replication
- **Caching**: ElastiCache Redis cluster with Multi-AZ
- **Security**: IAM roles, security groups, Secrets Manager
- **Monitoring**: CloudWatch logs and alarms
- **CDN**: CloudFront for static content delivery (production)
- **DNS**: Route 53 for domain management

### Architecture

```
[CloudFront CDN]
       ↓
[Route 53 DNS] → [Application Load Balancer]
                        ↓
                    ECS Cluster
                    /         \
           Backend Service   Frontend Service
           (1024 MB, 512 vCPU) (512 MB, 256 vCPU)
                    |              |
                    ↓              ↓
            [RDS PostgreSQL]  [ElastiCache Redis]
```

---

## Prerequisites

### Required Tools

- **Terraform** >= 1.5.0
  - Install: https://www.terraform.io/downloads
  - Verify: `terraform version`

- **AWS CLI** >= 2.0
  - Install: https://aws.amazon.com/cli/
  - Configure: `aws configure` with your AWS credentials

- **jq** (optional, for parsing JSON)
  - Install: https://stedolan.github.io/jq/

### AWS Permissions

Your AWS user/role must have permissions for:
- EC2 (VPC, Security Groups, Subnets)
- ECS (Clusters, Services, Task Definitions)
- RDS (DB Instances, Subnet Groups)
- ElastiCache (Clusters, Subnet Groups)
- ALB (Load Balancers, Target Groups, Listeners)
- IAM (Roles, Policies)
- CloudWatch (Log Groups, Alarms)
- Secrets Manager
- S3 (Bucket management)
- CloudFront (Distribution management)
- Route 53 (Hosted Zones, Records)

### AWS Account Setup

1. Create an S3 bucket for Terraform state (one per environment):
   ```bash
   aws s3api create-bucket \
     --bucket identity-service-terraform-state-staging \
     --region us-east-1
   ```

2. Create a DynamoDB table for state locking:
   ```bash
   aws dynamodb create-table \
     --table-name identity-service-tf-locks-staging \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region us-east-1
   ```

3. Request SSL/TLS certificate in ACM:
   ```bash
   aws acm request-certificate \
     --domain-name staging-api.identityservice.dev \
     --validation-method DNS \
     --region us-east-1
   ```

---

## Project Structure

```
terraform/
├── README.md                           # This file
├── provider.tf                         # AWS provider configuration
├── variables.tf                        # Global variables
├── outputs.tf                          # Global outputs
├── locals.tf                           # Local values
├── main.tf                             # Main configuration (module instantiation)
│
├── modules/                            # Reusable Terraform modules
│   ├── vpc/                            # VPC and networking
│   ├── security-groups/                # Security group management
│   ├── alb/                            # Application Load Balancer
│   ├── ecs/                            # ECS cluster and services
│   ├── rds/                            # RDS database
│   ├── elasticache/                    # Redis cache
│   ├── iam/                            # IAM roles and policies
│   ├── secrets/                        # Secrets Manager
│   ├── s3/                             # S3 buckets
│   ├── cloudwatch/                     # CloudWatch logging
│   ├── cloudfront/                     # CloudFront CDN
│   └── route53/                        # DNS management
│
├── environments/                       # Environment-specific configurations
│   ├── staging/
│   │   ├── backend.tf                  # Remote state configuration
│   │   └── terraform.tfvars            # Staging variables
│   └── production/
│       ├── backend.tf                  # Remote state configuration
│       └── terraform.tfvars            # Production variables
│
└── scripts/                            # Helper scripts
    ├── deploy.sh                       # Main deployment script
    ├── validate.sh                     # Validation script
    ├── format.sh                       # Code formatting
    ├── plan.sh                         # Generate plan
    └── apply.sh                        # Apply plan
```

---

## Quick Start

### 1. Clone the Repository

```bash
cd terraform
```

### 2. Install Dependencies

```bash
terraform version  # Verify Terraform is installed
aws --version      # Verify AWS CLI is installed
```

### 3. Configure Environment Variables

```bash
# Set AWS region
export AWS_REGION=us-east-1

# Set AWS profile (optional)
export AWS_PROFILE=default
```

### 4. Initialize Terraform (Staging)

```bash
cd terraform
terraform init \
  -backend-config="bucket=identity-service-terraform-state-staging" \
  -backend-config="key=staging/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=identity-service-tf-locks-staging"
```

### 5. Review the Plan

```bash
terraform plan \
  -var-file="environments/staging/terraform.tfvars"
```

### 6. Apply the Configuration

```bash
terraform apply \
  -var-file="environments/staging/terraform.tfvars"
```

### 7. View Outputs

```bash
terraform output

# Or get specific output
terraform output alb_dns_name
terraform output rds_endpoint
```

---

## Environment Configuration

### Staging vs. Production

The infrastructure automatically scales based on environment:

| Resource | Staging | Production |
|----------|---------|-----------|
| RDS Instance | db.t4g.micro | db.t4g.medium |
| RDS Multi-AZ | ✗ No | ✓ Yes |
| Redis Nodes | 1 | 3 |
| ECS Min Replicas | 1 | 2 |
| ECS Max Replicas | 2 | 6 |
| Backup Retention | 7 days | 30 days |
| Log Retention | 7 days | 90 days |
| Performance Insights | ✗ No | ✓ Yes |
| CloudFront CDN | ✗ No | ✓ Yes |

### Customizing Variables

Edit `environments/{staging,production}/terraform.tfvars`:

```hcl
# VPC Configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# ECS Configuration
ecs_cpu = "512"
ecs_memory = "1024"
ecs_desired_count = 3

# RDS Configuration
rds_instance_class = "db.t4g.medium"
rds_allocated_storage = 100

# Domain Configuration
domain_name = "api.identityservice.dev"
certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID"
```

---

## Deployment

### Deployment Workflow

#### 1. Plan the Deployment

```bash
./scripts/plan.sh staging
# or
terraform plan \
  -var-file="environments/staging/terraform.tfvars" \
  -out="terraform-staging.tfplan"
```

**What this does:**
- Analyzes your configuration
- Compares with current AWS state
- Shows all resources to be created/modified/destroyed
- **No resources are changed** ✓

#### 2. Review the Plan

Carefully review all proposed changes:
```bash
terraform show terraform-staging.tfplan
```

#### 3. Apply the Plan

```bash
./scripts/apply.sh staging
# or
terraform apply terraform-staging.tfplan
```

**What this does:**
- Creates/modifies/destroys AWS resources
- Updates Terraform state
- Prints outputs

#### 4. Verify Deployment

```bash
# Check ECS services
aws ecs list-services --cluster identity-service-staging

# Check RDS instance
aws rds describe-db-instances --db-instance-identifier identity-service-staging

# Test ALB
curl https://$(terraform output -raw alb_dns_name)/health
```

### Using Deployment Scripts

```bash
# Validate Terraform code
./scripts/validate.sh

# Format code
./scripts/format.sh

# Generate plan (staging)
./scripts/plan.sh staging

# Apply plan (staging)
./scripts/apply.sh staging

# Full deployment (plan + apply)
./scripts/deploy.sh staging apply
```

### Manual Deployment Commands

```bash
# Initialize
terraform init \
  -backend-config="bucket=identity-service-terraform-state-staging" \
  -backend-config="key=staging/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=identity-service-tf-locks-staging"

# Plan
terraform plan \
  -var-file="environments/staging/terraform.tfvars" \
  -out="plan.tfplan"

# Apply
terraform apply plan.tfplan

# Destroy (when needed)
terraform destroy \
  -var-file="environments/staging/terraform.tfvars"
```

---

## Outputs

After deployment, Terraform outputs key information:

```bash
terraform output
```

Example outputs:

```
alb_dns_name = "identity-service-staging-alb-1234567890.us-east-1.elb.amazonaws.com"
alb_arn = "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/identity-service-staging-alb/1a2b3c4d5e6f7g8h"
ecs_cluster_name = "identity-service-staging"
ecs_backend_service_name = "identity-service-staging-backend"
rds_endpoint = "identity-service-staging-db.c1a2b3c4d5e6.us-east-1.rds.amazonaws.com:5432"
redis_endpoint = "identity-service-staging-redis.a1b2c3d.ng.0001.use1.cache.amazonaws.com"
cloudwatch_backend_log_group = "/ecs/identity-service-staging-backend"
application_url = "https://staging-api.identityservice.dev"
api_endpoint = "https://staging-api.identityservice.dev/api"
```

### Accessing Outputs Programmatically

```bash
# Get single value
terraform output alb_dns_name

# Get JSON format
terraform output -json

# Get specific nested value
terraform output -json | jq '.alb_dns_name.value'
```

---

## Troubleshooting

### Common Issues

#### 1. AWS Credentials Not Found

```bash
# Solution: Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_REGION="us-east-1"
```

#### 2. State Lock Issues

```bash
# If stuck on state lock:
terraform force-unlock <LOCK_ID>

# Get lock ID from error message
```

#### 3. Resource Already Exists

```bash
# Option 1: Import existing resource
terraform import aws_s3_bucket.logs my-existing-bucket

# Option 2: Destroy and recreate
terraform destroy -var-file="environments/staging/terraform.tfvars"
terraform apply -var-file="environments/staging/terraform.tfvars"
```

#### 4. Insufficient AWS Permissions

**Error:** `AccessDenied: User is not authorized to perform: ec2:CreateVpc`

**Solution:** Request necessary IAM permissions from your AWS administrator

#### 5. Certificate Not Found

```bash
# Error: InvalidParameterException: Certificate not found

# Solution: Create certificate first
aws acm request-certificate \
  --domain-name staging-api.identityservice.dev \
  --validation-method DNS \
  --region us-east-1

# Update terraform.tfvars with correct certificate ARN
```

### Debugging

Enable verbose logging:
```bash
export TF_LOG=DEBUG
terraform apply -var-file="environments/staging/terraform.tfvars"
```

Check AWS CloudTrail for resource creation logs:
```bash
aws cloudtrail lookup-events \
  --max-items 10 \
  --region us-east-1
```

### Validating Infrastructure

After deployment, run health checks:

```bash
# Test ALB
curl https://$(terraform output -raw alb_dns_name)/health

# Check ECS tasks
aws ecs list-tasks \
  --cluster $(terraform output -raw ecs_cluster_name)

# Verify database connection
psql -h $(terraform output -raw rds_endpoint | cut -d: -f1) \
  -U postgres -d identitydb
```

---

## Best Practices

### 1. State Management

- ✅ Always use remote state (S3 + DynamoDB)
- ✅ Enable state versioning
- ✅ Never commit tfstate files to Git
- ✅ Use state locking to prevent conflicts
- ✅ Backup state regularly

### 2. Code Organization

- ✅ Use modules for reusability
- ✅ Separate environments (staging, production)
- ✅ Keep variables in separate files
- ✅ Document module inputs/outputs
- ✅ Use consistent naming conventions

### 3. Security

- ✅ Store secrets in AWS Secrets Manager, not in code
- ✅ Use least privilege IAM policies
- ✅ Enable encryption for all data (RDS, S3, EBS)
- ✅ Use VPC and security groups
- ✅ Enable CloudTrail for audit logging
- ✅ Rotate credentials regularly

### 4. Maintenance

- ✅ Use terraform plan before any changes
- ✅ Review all changes before applying
- ✅ Keep Terraform updated
- ✅ Run terraform fmt -recursive regularly
- ✅ Document custom modifications

### 5. CI/CD Integration

Create `.github/workflows/terraform.yml`:

```yaml
name: Terraform

on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: hashicorp/setup-terraform@v1
      - run: terraform fmt -check -recursive terraform/
      - run: terraform validate
  
  plan:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: hashicorp/setup-terraform@v1
      - run: terraform plan -var-file="terraform/environments/staging/terraform.tfvars"
```

---

## Advanced Topics

### Scaling

To scale the service, modify `environments/{env}/terraform.tfvars`:

```hcl
# Increase ECS capacity
ecs_desired_count = 5
ecs_max_capacity = 10

# Upgrade RDS
rds_instance_class = "db.t4g.large"
rds_allocated_storage = 200

# Upgrade Redis
redis_node_type = "cache.r7g.large"
```

Then run:
```bash
terraform plan && terraform apply
```

### Blue-Green Deployment

To perform blue-green deployments:

1. Create two service versions
2. Route traffic between them using ALB
3. Use CloudWatch alarms to monitor health
4. Switch traffic when ready

### Disaster Recovery

To implement DR:

1. **Backup RDS**: Automated backups (30-day retention)
2. **Cross-region replica**: RDS read replicas in different region
3. **Redis persistence**: Enable RDB snapshots
4. **Database export**: Regular exports to S3

### Cost Optimization

Reduce costs:

```hcl
# Use smaller instance in staging
rds_instance_class = "db.t4g.micro"
redis_node_type = "cache.t4g.micro"

# Reduce backups
rds_backup_retention_days = 7

# Use reserved instances for production
```

---

## Support & Documentation

- Terraform Docs: https://www.terraform.io/docs
- AWS Terraform Provider: https://registry.terraform.io/providers/hashicorp/aws/latest
- Identity Service API: See `/docs` directory
- AWS Best Practices: https://aws.amazon.com/architecture/well-architected/

---

**Last Updated**: 2024-01-15  
**Terraform Version**: >= 1.5.0  
**AWS Provider Version**: >= 5.0

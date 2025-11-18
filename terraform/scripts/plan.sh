#!/bin/bash
# Generate Terraform Plan

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo "Usage: $0 {staging|production}"
    exit 1
fi

cd "$(dirname "$0")/../terraform"

echo "=========================================="
echo "Generating Terraform Plan"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo ""

terraform init -upgrade -var-file="environments/$ENVIRONMENT/terraform.tfvars" 2>/dev/null || true

echo "Generating plan..."
terraform plan \
    -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
    -out="terraform-$ENVIRONMENT.tfplan" \
    -compact-warnings

echo ""
echo "Plan saved to: terraform-$ENVIRONMENT.tfplan"
echo ""
echo "To view the plan:"
echo "  terraform show terraform-$ENVIRONMENT.tfplan"
echo ""
echo "To apply the plan:"
echo "  terraform apply terraform-$ENVIRONMENT.tfplan"

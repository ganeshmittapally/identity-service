#!/bin/bash
# Apply Terraform Plan

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo "Usage: $0 {staging|production}"
    exit 1
fi

cd "$(dirname "$0")/../terraform"

if [ ! -f "terraform-$ENVIRONMENT.tfplan" ]; then
    echo "Error: terraform-$ENVIRONMENT.tfplan not found"
    echo "Run: ./scripts/plan.sh $ENVIRONMENT"
    exit 1
fi

echo "=========================================="
echo "Applying Terraform Plan"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo ""
echo "WARNING: This will create/modify/destroy AWS resources!"
read -p "Type 'yes' to continue: " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Apply cancelled."
    exit 0
fi

terraform apply terraform-$ENVIRONMENT.tfplan

echo ""
echo "=========================================="
echo "Application complete"
echo "=========================================="
echo ""
echo "To view outputs:"
echo "  terraform output"

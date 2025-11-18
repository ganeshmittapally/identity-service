#!/bin/bash
# Deploy Terraform Infrastructure

set -e

ENVIRONMENT=${1:-staging}
ACTION=${2:-plan}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    echo "Usage: $0 {staging|production} {plan|apply|destroy}"
    exit 1
fi

if [ "$ACTION" != "plan" ] && [ "$ACTION" != "apply" ] && [ "$ACTION" != "destroy" ]; then
    echo "Usage: $0 {staging|production} {plan|apply|destroy}"
    exit 1
fi

echo "=========================================="
echo "Terraform Deployment Script"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Action: $ACTION"
echo ""

# Change to terraform directory
cd "$(dirname "$0")/../terraform"

# Initialize Terraform if needed
echo "Initializing Terraform..."
terraform init -backend-config="environments/$ENVIRONMENT/backend.tf" -upgrade

# Format check
echo "Checking Terraform formatting..."
terraform fmt -check -recursive || true

# Validate configuration
echo "Validating Terraform configuration..."
terraform validate

# Switch workspace (optional)
echo "Selecting workspace: $ENVIRONMENT"
terraform workspace select "$ENVIRONMENT" || terraform workspace new "$ENVIRONMENT"

case $ACTION in
    plan)
        echo ""
        echo "Generating Terraform plan..."
        terraform plan \
            -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
            -out="terraform-$ENVIRONMENT.tfplan"
        echo "Plan saved to: terraform-$ENVIRONMENT.tfplan"
        echo ""
        echo "Review the plan above. To apply, run:"
        echo "$0 $ENVIRONMENT apply"
        ;;
    
    apply)
        echo ""
        echo "Applying Terraform configuration..."
        if [ -f "terraform-$ENVIRONMENT.tfplan" ]; then
            terraform apply "terraform-$ENVIRONMENT.tfplan"
        else
            terraform apply \
                -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
                -auto-approve=false
        fi
        
        echo ""
        echo "Infrastructure deployment complete!"
        echo "To see outputs, run: terraform output"
        ;;
    
    destroy)
        echo ""
        echo "WARNING: This will destroy all infrastructure in $ENVIRONMENT!"
        read -p "Type 'destroy-$ENVIRONMENT' to confirm: " confirmation
        if [ "$confirmation" = "destroy-$ENVIRONMENT" ]; then
            terraform destroy \
                -var-file="environments/$ENVIRONMENT/terraform.tfvars"
        else
            echo "Destroy cancelled."
        fi
        ;;
esac

echo "=========================================="
echo "Script completed successfully"
echo "=========================================="

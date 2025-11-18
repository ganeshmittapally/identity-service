# Security Groups Module - Flexible security group management

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_security_group" "main" {
  name_prefix = "${var.name_prefix}-"
  description = var.description
  vpc_id      = var.vpc_id

  tags = merge(
    var.common_tags,
    {
      Name = "${var.name_prefix}-sg"
    }
  )
}

resource "aws_vpc_security_group_ingress_rule" "main" {
  for_each = {
    for idx, rule in var.ingress_rules : idx => rule
  }

  security_group_id = aws_security_group.main.id

  from_port   = each.value.from_port
  to_port     = each.value.to_port
  ip_protocol = each.value.protocol

  cidr_ipv4                    = try(each.value.cidr_blocks[0], null)
  referenced_security_group_id = try(each.value.security_groups[0], null)
  
  description = each.value.description

  tags = merge(
    var.common_tags,
    {
      Name = "${var.name_prefix}-ingress-${each.key}"
    }
  )
}

resource "aws_vpc_security_group_egress_rule" "main" {
  for_each = {
    for idx, rule in var.egress_rules : idx => rule
  }

  security_group_id = aws_security_group.main.id

  from_port   = each.value.from_port
  to_port     = each.value.to_port
  ip_protocol = each.value.protocol

  cidr_ipv4       = try(each.value.cidr_blocks[0], null)
  description     = each.value.description

  tags = merge(
    var.common_tags,
    {
      Name = "${var.name_prefix}-egress-${each.key}"
    }
  )
}

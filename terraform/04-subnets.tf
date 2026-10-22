# ==============================================================================
# 04-subnets.tf
# PURPOSE: Creates Public and Private Subnets across 2 Availability Zones.
# Adds critical Kubernetes tags so EKS and ALB know where to route traffic!
# ==============================================================================

# 1. Two Public Subnets (For ALB Load Balancer and NAT Gateway)
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24" # 10.0.1.0/24 and 10.0.2.0/24
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                                    = "${var.project_name}-public-${var.availability_zones[count.index]}"
    "kubernetes.io/role/elb"                                = "1" # Signals AWS Load Balancer Controller to put public ALBs here!
    "kubernetes.io/cluster/${var.project_name}-eks-cluster" = "shared"
  }
}

# 2. Two Private Subnets (For EKS Worker Node `m7i-flex.large` and Microservice Pods)
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24" # 10.0.10.0/24 and 10.0.11.0/24
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name                                                    = "${var.project_name}-private-${var.availability_zones[count.index]}"
    "kubernetes.io/role/internal-elb"                       = "1" # For internal services
    "kubernetes.io/cluster/${var.project_name}-eks-cluster" = "shared"
  }
}

# 3. Associate Public Subnets with Public Route Table
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# 4. Associate Private Subnets with Private Route Table
resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

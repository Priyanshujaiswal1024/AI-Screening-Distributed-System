# ==============================================================================
# 03-vpc.tf
# PURPOSE: Creates the foundational network (VPC, Internet Gateway, NAT Gateway).
# ==============================================================================

# 1. Main Virtual Private Cloud (VPC)
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true # Required for EKS cluster communication
  enable_dns_hostnames = true # Required for worker nodes to resolve internal DNS

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# 2. Internet Gateway (IGW) - The front door allowing public traffic into the VPC
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# 3. Elastic IP for the NAT Gateway (Static Public IP for outbound pod traffic)
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip"
  }
}

# 4. NAT Gateway - Sits in Public Subnet. Allows private EKS pods to securely
# call external APIs (Groq Cloud LLM, Gmail SMTP) without being exposed to attacks.
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id # Placed in the first public subnet

  tags = {
    Name = "${var.project_name}-nat-gw"
  }

  depends_on = [aws_internet_gateway.main]
}

# 5. Public Route Table - Routes internet-bound traffic (0.0.0.0/0) to the Internet Gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

# 6. Private Route Table - Routes private pod outbound traffic (0.0.0.0/0) to the NAT Gateway
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}

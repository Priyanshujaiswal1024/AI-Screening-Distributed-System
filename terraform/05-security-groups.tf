# ==============================================================================
# 05-security-groups.tf
# PURPOSE: Virtual Firewalls for the Application Load Balancer and EKS Worker Nodes.
# ==============================================================================

# 1. Security Group for the Public Application Load Balancer (ALB)
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Controls inbound web traffic from the internet to ALB"
  vpc_id      = aws_vpc.main.id

  # Allow HTTP (Port 80) from anywhere
  ingress {
    description = "Allow HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTPS (Port 443) from anywhere
  ingress {
    description = "Allow HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound rule: Allow ALB to route traffic to any destination inside the VPC
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

# 2. Security Group for EKS Worker Nodes (`m7i-flex.large`)
resource "aws_security_group" "eks_nodes" {
  name        = "${var.project_name}-eks-nodes-sg"
  description = "Controls internal traffic between pods and from the ALB"
  vpc_id      = aws_vpc.main.id

  # Allow incoming traffic ONLY from the ALB (Protects microservices from direct internet attacks)
  ingress {
    description     = "Allow traffic from ALB into pods"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow pods on worker nodes to talk to each other (e.g. Gateway -> Eureka -> Auth)
  ingress {
    description = "Allow node-to-node internal communication"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  # Outbound rule: Allow nodes/pods to make calls to external APIs (Groq, Gmail, ECR)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-eks-nodes-sg"
  }
}

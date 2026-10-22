# ==============================================================================
# 01-variables.tf
# PURPOSE: Declares all input variables. You can customize values in terraform.tfvars.
# ==============================================================================

variable "aws_region" {
  description = "AWS Region where all infrastructure will be deployed"
  type        = string
  default     = "eu-north-1" # Stockholm
}

variable "project_name" {
  description = "Project name prefix used to tag and name resources"
  type        = string
  default     = "talentiq"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block IP range for the main VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Two AWS Availability Zones for High Availability"
  type        = list(string)
  default     = ["eu-north-1a", "eu-north-1b"]
}

variable "eks_version" {
  description = "Kubernetes version to install on EKS"
  type        = string
  default     = "1.30"
}

variable "node_instance_type" {
  description = "EC2 Instance type for the EKS worker nodes (ASG)"
  type        = string
  default     = "m7i-flex.large" # 2 vCPU, 8 GB RAM
}

variable "node_desired_size" {
  description = "Initial number of worker node instances to launch"
  type        = number
  default     = 1
}

variable "node_min_size" {
  description = "Minimum number of worker node instances for ASG"
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of worker node instances when traffic spikes"
  type        = number
  default     = 3
}

variable "services" {
  description = "List of all 11 microservices + 1 frontend for ECR repositories"
  type        = list(string)
  default = [
    "api-gateway",
    "eureka-server",
    "authentication-service",
    "user-management-service",
    "job-description-service",
    "resume-management-service",
    "ai-screening-service",
    "candidate-ranking-service",
    "recruiter-chat-service",
    "interview-scheduling-service",
    "notification-service",
    "frontend"
  ]
}

# ==============================================================================
# 02-terraform.tfvars
# PURPOSE: Supplies actual values for variables. Edit this file if you ever want
# to change region, instance types, or scaling sizes without touching code!
# ==============================================================================

aws_region   = "eu-north-1" # Stockholm
project_name = "talentiq"
environment  = "dev"

node_instance_type = "m7i-flex.large" # Best price-to-performance for AI Screening
node_desired_size  = 1                # Starts with 1 node (Keeps cost minimal)
node_min_size      = 1
node_max_size      = 3 # Scales up to 3 nodes during heavy resume screening

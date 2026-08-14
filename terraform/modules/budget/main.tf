# terraform/modules/budget/main.tf
# AWS Budget Alerts module for EKS cloud infrastructure cost control ($150/mo limit)

resource "aws_budgets_budget" "monthly_budget" {
  name         = "aurabank-monthly-budget"
  budget_type  = "COST"
  limit_amount = var.monthly_limit
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_emails
  }
}

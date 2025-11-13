Multi-Tenant SaaS Platform with Namespace Isolation
Build a youth program management system for skill learning bootcamps:
Funnel: Mobilization, Acquisition, Verification, Retention, Graduation, Follow Up

Core Concept: Each organization gets isolated namespace with dedicated resources
Features:

Automated namespace provisioning via custom operator or scripts
RBAC per tenant with custom roles
Resource quotas and network policies per tenant
Tenant-specific databases with PVCs
Shared services (monitoring, logging) in system namespaces


Admin Dashboard: React app showing tenant metrics, resource usage, health
Security: Pod Security Admission, secrets management with sealed-secrets
Cost Tracking: Label-based resource tracking and reporting

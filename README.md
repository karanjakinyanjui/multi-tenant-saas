# Multi-Tenant SaaS Platform for Youth Program Management

A Kubernetes-native multi-tenant SaaS platform for managing skill learning bootcamps with complete namespace isolation.

## Overview

This platform manages youth programs through a structured funnel approach:
- **Mobilization**: Initial outreach and engagement
- **Acquisition**: Registration and onboarding
- **Verification**: Skills assessment and placement
- **Retention**: Active participation tracking
- **Graduation**: Completion and certification
- **Follow Up**: Post-program engagement

## Architecture

### Core Components

1. **Tenant Operator**: Automated namespace provisioning with dedicated resources
2. **Backend API**: Multi-tenant Node.js/Express application
3. **Admin Dashboard**: React-based monitoring and management interface
4. **Database Layer**: Tenant-isolated PostgreSQL instances
5. **Shared Services**: Centralized monitoring, logging, and cost tracking

### Multi-Tenancy Model

- **Namespace Isolation**: Each organization gets a dedicated namespace
- **RBAC**: Custom roles per tenant with fine-grained permissions
- **Resource Quotas**: CPU, memory, and storage limits per tenant
- **Network Policies**: Isolated network traffic between tenants
- **Database Isolation**: Separate PostgreSQL instances with PVCs

## Project Structure

```
multi-tenant-saas/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Auth, tenant isolation
│   │   ├── services/       # Business logic
│   │   └── routes/         # API routes
│   ├── package.json
│   └── Dockerfile
├── frontend/               # React admin dashboard
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Dashboard pages
│   │   ├── services/      # API clients
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
├── operator/              # Kubernetes operator
│   ├── controllers/       # Tenant provisioning logic
│   ├── config/           # CRD definitions
│   └── main.go
├── k8s/                  # Kubernetes manifests
│   ├── base/            # Base configurations
│   ├── operators/       # Operator deployment
│   ├── tenants/         # Tenant templates
│   ├── monitoring/      # Prometheus, Grafana
│   └── security/        # RBAC, PSA, network policies
├── scripts/             # Automation scripts
│   ├── provision-tenant.sh
│   ├── cost-report.sh
│   └── backup.sh
└── docs/               # Documentation
    ├── architecture.md
    ├── deployment.md
    └── api.md
```

## Features

### Tenant Management
- Automated namespace provisioning
- Custom resource quotas per tenant
- Isolated networking with network policies
- Dedicated database instances
- Tenant-specific monitoring dashboards

### Security
- Pod Security Admission (restricted profile)
- Sealed Secrets for sensitive data
- RBAC with custom roles (tenant-admin, tenant-user, super-admin)
- mTLS between services
- Audit logging

### Youth Program Management
- Participant tracking through 6-stage funnel
- Progress monitoring and analytics
- Skill assessment tools
- Graduation certification
- Follow-up engagement tracking

### Admin Dashboard
- Real-time tenant metrics
- Resource usage monitoring
- Cost allocation and tracking
- Health status indicators
- Tenant provisioning interface

### Cost Tracking
- Label-based resource tagging
- Per-tenant cost reports
- Resource usage analytics
- Budget alerts and forecasting

## Quick Start

### Prerequisites
- Kubernetes cluster (v1.25+)
- kubectl configured
- Helm 3
- Node.js 18+
- Docker

### Installation

1. **Deploy the operator**:
```bash
kubectl apply -f k8s/operators/
```

2. **Install shared services**:
```bash
kubectl apply -f k8s/monitoring/
```

3. **Deploy backend API**:
```bash
cd backend
docker build -t youth-saas-api:latest .
kubectl apply -f k8s/base/backend.yaml
```

4. **Deploy admin dashboard**:
```bash
cd frontend
docker build -t youth-saas-dashboard:latest .
kubectl apply -f k8s/base/frontend.yaml
```

5. **Provision a new tenant**:
```bash
./scripts/provision-tenant.sh --name acme-org --email admin@acme.org
```

## API Documentation

See [API Documentation](docs/api.md) for complete API reference.

### Key Endpoints

- `POST /api/tenants` - Create new tenant
- `GET /api/tenants/:id/metrics` - Get tenant metrics
- `POST /api/participants` - Add participant
- `GET /api/participants/:id/funnel` - Get funnel progress
- `GET /api/cost/report` - Generate cost report

## Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Testing
```bash
npm test
```

## Monitoring

- **Prometheus**: Metrics collection at `:9090`
- **Grafana**: Dashboards at `:3000`
- **Loki**: Log aggregation
- **Jaeger**: Distributed tracing

## License

MIT

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

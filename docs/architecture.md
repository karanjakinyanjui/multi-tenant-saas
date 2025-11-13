# System Architecture

## Overview

The Multi-Tenant Youth Program SaaS Platform is built on Kubernetes with complete namespace isolation, providing organizations with dedicated resources for managing skill learning bootcamps.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Ingress Controller                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
┌───────▼────────┐              ┌─────────▼────────┐
│  Admin         │              │  Tenant          │
│  Dashboard     │              │  Applications    │
│  (React)       │              │  (Multi-tenant)  │
└───────┬────────┘              └─────────┬────────┘
        │                                  │
        └────────────────┬─────────────────┘
                         │
                ┌────────▼────────┐
                │   Backend API    │
                │  (Node.js)       │
                │  - Tenant Mgmt   │
                │  - Participant   │
                │  - Funnel Track  │
                │  - Cost Report   │
                └────────┬─────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                 │
┌───────▼────────┐ ┌────▼─────┐  ┌──────▼────────┐
│ Kubernetes API │ │PostgreSQL│  │  Monitoring   │
│   (K8s)        │ │(Per Tenant)│  │  (Prometheus) │
└────────────────┘ └──────────┘  └───────────────┘
```

## Components

### 1. Frontend (React Admin Dashboard)

**Technology Stack:**
- React 18 with TypeScript
- Material-UI (MUI) for components
- Recharts for data visualization
- React Query for data fetching
- Zustand for state management

**Features:**
- Tenant management interface
- Participant tracking through funnel stages
- Real-time metrics and analytics
- Cost reporting and resource monitoring
- RBAC-based access control

**Key Pages:**
- Dashboard: Overview of all metrics
- Tenants: Manage organizations
- Participants: Track youth through program stages
- Funnel Analytics: Visualize conversion rates
- Cost Reporting: Resource usage and costs

### 2. Backend API (Node.js/Express)

**Technology Stack:**
- Node.js 18+ with TypeScript
- Express.js framework
- Knex.js for database queries
- Kubernetes Client for resource management
- Prometheus client for metrics
- Winston for logging

**Key Services:**

**TenantService:**
- Automated namespace provisioning
- RBAC role creation
- Network policy configuration
- Resource quota management
- Database deployment

**ParticipantModel:**
- Participant CRUD operations
- Funnel stage tracking
- Progress analytics

**CostService:**
- Resource usage monitoring
- Cost calculation by tenant
- Budget tracking and alerts

**Authentication:**
- JWT-based authentication
- Role-based access control (RBAC)
- Tenant isolation enforcement

### 3. Database Layer

**Design:**
- Each tenant gets a dedicated PostgreSQL instance
- Deployed in tenant's isolated namespace
- Persistent storage via PVCs
- Automatic backup support

**Schema:**
```sql
-- Tenants table (system database)
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  namespace VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  quotas JSONB NOT NULL,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Participants table (per-tenant database)
CREATE TABLE participants (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  current_stage VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  skills JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  enrolled_at TIMESTAMP DEFAULT NOW()
);

-- Funnel progress table (per-tenant database)
CREATE TABLE funnel_progress (
  id UUID PRIMARY KEY,
  participant_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  stage VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  data JSONB
);
```

### 4. Kubernetes Infrastructure

**Namespace Strategy:**
- `youth-saas-system`: Core platform components
- `tenant-<name>-<timestamp>`: Per-tenant namespaces
- `monitoring`: Shared monitoring stack

**Security:**
- Pod Security Admission (restricted profile)
- Network policies for isolation
- Sealed Secrets for sensitive data
- RBAC with custom roles

**Resource Management:**
- ResourceQuotas per tenant
- LimitRanges for containers
- PriorityClasses for workload scheduling

### 5. Monitoring and Observability

**Prometheus:**
- Custom metrics from backend API
- Kubernetes resource metrics
- Per-tenant usage tracking

**Grafana Dashboards:**
- Platform overview
- Per-tenant resource usage
- Funnel conversion metrics
- Cost analysis

**Logging:**
- Centralized logging with Loki
- Structured JSON logs
- Per-tenant log isolation

## Youth Program Funnel

The platform tracks participants through 6 stages:

1. **Mobilization**: Initial outreach and awareness
2. **Acquisition**: Registration and onboarding
3. **Verification**: Skills assessment and placement
4. **Retention**: Active participation in bootcamp
5. **Graduation**: Program completion and certification
6. **Follow Up**: Post-program engagement and placement

Each stage tracks:
- Entry and completion timestamps
- Success criteria
- Associated data (assessments, certificates, etc.)
- Transition reasons

## Multi-Tenancy Implementation

### Namespace Isolation

Each tenant gets:
- Dedicated Kubernetes namespace
- Isolated network policies
- Separate resource quotas
- Independent database instance

### RBAC Model

**Roles:**
- `super-admin`: Full platform access
- `tenant-admin`: Full access within tenant namespace
- `tenant-user`: Read-only access within tenant namespace

**Permissions:**
```yaml
super-admin:
  - Manage all tenants
  - View all metrics
  - Access cost reporting
  - System configuration

tenant-admin:
  - Manage participants
  - View tenant metrics
  - Manage users
  - Configure settings

tenant-user:
  - View participants
  - View basic metrics
  - Track progress
```

### Resource Quotas

**Basic Tier:**
- CPU: 2 cores
- Memory: 4Gi
- Storage: 10Gi
- Max Participants: 100

**Pro Tier:**
- CPU: 4 cores
- Memory: 8Gi
- Storage: 20Gi
- Max Participants: 500

**Enterprise Tier:**
- CPU: 8 cores
- Memory: 16Gi
- Storage: 50Gi
- Max Participants: Unlimited

## Cost Tracking

**Calculation Model:**
- CPU: $0.05 per core-hour
- Memory: $0.01 per GB-hour
- Storage: $0.10 per GB-month

**Features:**
- Real-time resource usage monitoring
- Per-tenant cost allocation
- Budget alerts
- Monthly cost reports
- Cost optimization recommendations

## Security Considerations

1. **Pod Security:**
   - RunAsNonRoot enforced
   - No privilege escalation
   - Capabilities dropped
   - Read-only root filesystem (where possible)

2. **Network Security:**
   - Default deny all ingress
   - Explicit allow within namespace
   - Monitoring namespace access only

3. **Data Security:**
   - Secrets managed via Sealed Secrets
   - TLS for all external communication
   - Database encryption at rest

4. **Authentication:**
   - JWT with short expiration
   - Secure password hashing (bcrypt)
   - Session management

## Scalability

**Horizontal Scaling:**
- Backend API: 3+ replicas with auto-scaling
- Load balancing via Kubernetes Service
- Database read replicas (future)

**Vertical Scaling:**
- Per-tenant resource quota adjustments
- Tier-based resource allocation
- Dynamic quota management

## High Availability

- Multi-replica deployments
- PodDisruptionBudgets
- Health checks and auto-restart
- Database backups and recovery
- Cross-zone deployment (production)

## Future Enhancements

1. **Custom Operator:**
   - Replace shell scripts with Go operator
   - CRD for tenant management
   - Automated lifecycle management

2. **Advanced Analytics:**
   - Machine learning for dropout prediction
   - Funnel optimization recommendations
   - Cohort analysis

3. **Integration:**
   - SSO/SAML support
   - Webhook notifications
   - Third-party API integrations

4. **Multi-Region:**
   - Geographic distribution
   - Data residency compliance
   - Edge deployments

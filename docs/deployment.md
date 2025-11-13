# Deployment Guide

This guide covers deploying the Multi-Tenant Youth Program SaaS Platform to a Kubernetes cluster.

## Prerequisites

### Required Tools

- **Kubernetes cluster** (v1.25+)
  - Minikube, Kind, or cloud provider (GKE, EKS, AKS)
  - Minimum: 4 CPU cores, 8GB RAM
- **kubectl** (v1.25+)
- **Docker** (v20.10+)
- **Node.js** (v18+)
- **Helm** (v3+) - optional, for monitoring stack

### Optional Tools

- **kubeseal** - for sealed-secrets
- **k9s** - for cluster management
- **stern** - for log tailing

## Quick Start (Local Development)

### 1. Clone Repository

```bash
git clone <repository-url>
cd multi-tenant-saas
```

### 2. Start Local Kubernetes Cluster

Using Minikube:
```bash
minikube start --cpus=4 --memory=8192 --driver=docker
```

Using Kind:
```bash
kind create cluster --config=k8s/kind-config.yaml
```

### 3. Build Docker Images

Backend:
```bash
cd backend
docker build -t youth-saas-api:latest .
cd ..
```

Frontend:
```bash
cd frontend
docker build -t youth-saas-dashboard:latest .
cd ..
```

For Minikube, load images:
```bash
minikube image load youth-saas-api:latest
minikube image load youth-saas-dashboard:latest
```

### 4. Deploy Platform

Create system namespace:
```bash
kubectl apply -f k8s/base/namespace.yaml
```

Create secrets:
```bash
kubectl create secret generic backend-secrets \
  --from-literal=db-host=postgres.youth-saas-system.svc.cluster.local \
  --from-literal=db-user=admin \
  --from-literal=db-password=change-me-in-production \
  --from-literal=db-name=youth_saas \
  --from-literal=jwt-secret=your-super-secret-jwt-key \
  --namespace youth-saas-system
```

Apply RBAC:
```bash
kubectl apply -f k8s/security/rbac.yaml
```

Deploy backend:
```bash
kubectl apply -f k8s/base/backend-deployment.yaml
```

Deploy frontend (if you have the manifest):
```bash
kubectl apply -f k8s/base/frontend-deployment.yaml
```

### 5. Access the Application

Port forward the services:
```bash
# Backend API
kubectl port-forward -n youth-saas-system svc/youth-saas-api 3000:80

# Frontend (if deployed)
kubectl port-forward -n youth-saas-system svc/youth-saas-dashboard 3001:80
```

Access:
- Backend API: http://localhost:3000
- Frontend: http://localhost:3001

## Production Deployment

### 1. Prepare Infrastructure

**Cloud Provider Setup:**

For GKE:
```bash
gcloud container clusters create youth-saas-cluster \
  --num-nodes=3 \
  --machine-type=n1-standard-4 \
  --zone=us-central1-a \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10
```

For EKS:
```bash
eksctl create cluster \
  --name youth-saas-cluster \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type m5.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10
```

### 2. Install Prerequisites

**Install Sealed Secrets Controller:**
```bash
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml
```

**Install cert-manager (for TLS):**
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### 3. Create Production Secrets

Install kubeseal:
```bash
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-linux-amd64
sudo install -m 755 kubeseal-linux-amd64 /usr/local/bin/kubeseal
```

Create secret:
```bash
kubectl create secret generic backend-secrets \
  --from-literal=db-host=your-production-db-host \
  --from-literal=db-user=your-db-user \
  --from-literal=db-password=$(openssl rand -base64 32) \
  --from-literal=db-name=youth_saas \
  --from-literal=jwt-secret=$(openssl rand -base64 64) \
  --namespace youth-saas-system \
  --dry-run=client -o yaml | \
kubeseal -o yaml > k8s/security/sealed-backend-secrets.yaml
```

Apply sealed secret:
```bash
kubectl apply -f k8s/security/sealed-backend-secrets.yaml
```

### 4. Build and Push Images

Tag and push to registry:
```bash
# Replace with your registry
REGISTRY=gcr.io/your-project-id

# Backend
docker build -t $REGISTRY/youth-saas-api:v1.0.0 ./backend
docker push $REGISTRY/youth-saas-api:v1.0.0

# Frontend
docker build -t $REGISTRY/youth-saas-dashboard:v1.0.0 ./frontend
docker push $REGISTRY/youth-saas-dashboard:v1.0.0
```

Update image references in manifests:
```bash
sed -i "s|youth-saas-api:latest|$REGISTRY/youth-saas-api:v1.0.0|g" k8s/base/backend-deployment.yaml
```

### 5. Deploy Application

Apply all manifests:
```bash
# Namespaces
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/monitoring/namespace.yaml

# Security
kubectl apply -f k8s/security/rbac.yaml
kubectl apply -f k8s/security/pod-security-policy.yaml

# Application
kubectl apply -f k8s/base/backend-deployment.yaml

# Wait for rollout
kubectl rollout status deployment/youth-saas-api -n youth-saas-system
```

### 6. Configure Ingress

Create ingress for external access:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: youth-saas-ingress
  namespace: youth-saas-system
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.youth-saas.example.com
    - app.youth-saas.example.com
    secretName: youth-saas-tls
  rules:
  - host: api.youth-saas.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: youth-saas-api
            port:
              number: 80
  - host: app.youth-saas.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: youth-saas-dashboard
            port:
              number: 80
```

Apply:
```bash
kubectl apply -f k8s/base/ingress.yaml
```

### 7. Install Monitoring Stack

Using Prometheus Operator:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values k8s/monitoring/prometheus-values.yaml
```

## Provisioning Tenants

### Using the Script

Make script executable:
```bash
chmod +x scripts/provision-tenant.sh
```

Provision a tenant:
```bash
./scripts/provision-tenant.sh \
  --name "Acme Organization" \
  --email admin@acme.org \
  --tier pro \
  --cpu 4 \
  --memory 8Gi \
  --storage 20Gi
```

### Using the API

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -d '{
    "name": "Acme Organization",
    "email": "admin@acme.org",
    "tier": "pro",
    "quotas": {
      "cpu": "4",
      "memory": "8Gi",
      "storage": "20Gi",
      "maxParticipants": 500
    }
  }'
```

## Database Migration

### Initial Setup

Create migration:
```bash
cd backend
npm run migrate:make create_initial_schema
```

Run migrations:
```bash
npm run migrate:latest
```

### Seed Data

Create initial super admin:
```bash
npm run seed:run
```

## Monitoring and Observability

### Access Prometheus

```bash
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
```

Open: http://localhost:9090

### Access Grafana

```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

Default credentials:
- Username: admin
- Password: (get from secret)

```bash
kubectl get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode
```

### View Logs

Using kubectl:
```bash
kubectl logs -n youth-saas-system deployment/youth-saas-api -f
```

Using stern:
```bash
stern -n youth-saas-system youth-saas-api
```

## Backup and Recovery

### Database Backup

Create backup job:
```bash
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%Y%m%d) -n tenant-namespace
```

### Restore from Backup

```bash
# Copy backup file to pod
kubectl cp backup.sql tenant-namespace/postgres-pod:/tmp/backup.sql

# Restore
kubectl exec -n tenant-namespace postgres-pod -- \
  psql -U tenant_user -d youth_saas -f /tmp/backup.sql
```

## Scaling

### Scale Backend API

```bash
kubectl scale deployment youth-saas-api \
  --replicas=5 \
  -n youth-saas-system
```

### Enable Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: youth-saas-api-hpa
  namespace: youth-saas-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: youth-saas-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n youth-saas-system
kubectl describe pod <pod-name> -n youth-saas-system
```

### View Events

```bash
kubectl get events -n youth-saas-system --sort-by='.lastTimestamp'
```

### Check Resource Quotas

```bash
kubectl describe resourcequota -n tenant-namespace
```

### Debug Network Policies

```bash
# Test connectivity
kubectl run -n tenant-namespace test-pod --rm -it --image=nicolaka/netshoot -- bash
```

### Common Issues

**Pods not starting:**
- Check resource quotas
- Verify secrets exist
- Check image pull policy

**Database connection failed:**
- Verify PostgreSQL is running
- Check service DNS
- Validate credentials

**Permission denied:**
- Verify RBAC roles
- Check service account
- Validate namespace access

## Security Checklist

- [ ] Secrets managed via Sealed Secrets
- [ ] TLS certificates configured
- [ ] Network policies applied
- [ ] Pod Security Admission enabled
- [ ] RBAC configured correctly
- [ ] Resource quotas set
- [ ] Monitoring and alerting enabled
- [ ] Backup strategy implemented
- [ ] Audit logging enabled

## Next Steps

1. Configure domain and DNS
2. Set up CI/CD pipeline
3. Configure backup automation
4. Set up alerting rules
5. Performance tuning
6. Load testing
7. Disaster recovery planning

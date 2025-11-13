#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
TENANT_NAME=""
TENANT_EMAIL=""
TENANT_TIER="basic"
CPU_QUOTA="2"
MEMORY_QUOTA="4Gi"
STORAGE_QUOTA="10Gi"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --name)
      TENANT_NAME="$2"
      shift 2
      ;;
    --email)
      TENANT_EMAIL="$2"
      shift 2
      ;;
    --tier)
      TENANT_TIER="$2"
      shift 2
      ;;
    --cpu)
      CPU_QUOTA="$2"
      shift 2
      ;;
    --memory)
      MEMORY_QUOTA="$2"
      shift 2
      ;;
    --storage)
      STORAGE_QUOTA="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Validate required parameters
if [ -z "$TENANT_NAME" ] || [ -z "$TENANT_EMAIL" ]; then
  echo -e "${RED}Error: --name and --email are required${NC}"
  echo "Usage: $0 --name <tenant-name> --email <email> [--tier <basic|pro|enterprise>] [--cpu <quota>] [--memory <quota>] [--storage <quota>]"
  exit 1
fi

# Generate namespace name
NAMESPACE="tenant-$(echo $TENANT_NAME | tr '[:upper:]' '[:lower:]' | tr -cs '[:alnum:]' '-')-$(date +%s)"
TENANT_ID="tenant-$(uuidgen | tr '[:upper:]' '[:lower:]')"

echo -e "${GREEN}Provisioning tenant: $TENANT_NAME${NC}"
echo "Namespace: $NAMESPACE"
echo "Tier: $TENANT_TIER"
echo "Quotas: CPU=$CPU_QUOTA, Memory=$MEMORY_QUOTA, Storage=$STORAGE_QUOTA"

# Create namespace
echo -e "${YELLOW}Creating namespace...${NC}"
kubectl create namespace $NAMESPACE

# Label namespace
kubectl label namespace $NAMESPACE \
  app.kubernetes.io/managed-by=youth-saas-platform \
  tenant-id=$TENANT_ID \
  tenant-tier=$TENANT_TIER \
  cost-center=$TENANT_ID

kubectl annotate namespace $NAMESPACE \
  tenant-name="$TENANT_NAME" \
  tenant-email="$TENANT_EMAIL"

# Create resource quota
echo -e "${YELLOW}Creating resource quota...${NC}"
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: $NAMESPACE
spec:
  hard:
    requests.cpu: "$CPU_QUOTA"
    requests.memory: "$MEMORY_QUOTA"
    requests.storage: "$STORAGE_QUOTA"
    persistentvolumeclaims: "5"
    pods: "20"
    services: "10"
EOF

# Create network policies
echo -e "${YELLOW}Creating network policies...${NC}"

# Deny all ingress by default
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: $NAMESPACE
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF

# Allow internal communication
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-internal
  namespace: $NAMESPACE
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}
EOF

# Allow from monitoring namespace
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: $NAMESPACE
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
EOF

# Create RBAC roles
echo -e "${YELLOW}Creating RBAC roles...${NC}"

# Tenant admin role
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-admin
  namespace: $NAMESPACE
rules:
- apiGroups: ["", "apps", "batch"]
  resources: ["*"]
  verbs: ["*"]
EOF

# Tenant user role (read-only)
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-user
  namespace: $NAMESPACE
rules:
- apiGroups: ["", "apps"]
  resources: ["pods", "services", "deployments"]
  verbs: ["get", "list", "watch"]
EOF

# Create database secret
echo -e "${YELLOW}Creating database secret...${NC}"
DB_PASSWORD=$(openssl rand -base64 32)

kubectl create secret generic postgres-secret \
  --from-literal=password=$DB_PASSWORD \
  --namespace=$NAMESPACE

# Deploy PostgreSQL
echo -e "${YELLOW}Deploying PostgreSQL database...${NC}"

# Create PVC
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: $NAMESPACE
  labels:
    app: postgres
    tenant-id: $TENANT_ID
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
EOF

# Create deployment
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: $NAMESPACE
  labels:
    app: postgres
    tenant-id: $TENANT_ID
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 999
        fsGroup: 999
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: youth_saas
        - name: POSTGRES_USER
          value: tenant_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
          name: postgres
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
          subPath: postgres
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
EOF

# Create service
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: $NAMESPACE
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
EOF

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s

echo -e "${GREEN}Tenant provisioning completed successfully!${NC}"
echo ""
echo "Tenant Details:"
echo "  Namespace: $NAMESPACE"
echo "  Tenant ID: $TENANT_ID"
echo "  Database Password: $DB_PASSWORD"
echo ""
echo "To access the namespace:"
echo "  kubectl -n $NAMESPACE get all"

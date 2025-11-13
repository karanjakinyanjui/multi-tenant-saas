# API Documentation

Base URL: `http://localhost:3000/api` (development)

## Authentication

All endpoints except `/auth/*` require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /auth/register

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "tenantId": "tenant-uuid",
  "role": "tenant-user"
}
```

**Response:** `201 Created`
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "tenantId": "tenant-uuid",
  "role": "tenant-user"
}
```

#### POST /auth/login

Login and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "tenantId": "tenant-uuid",
    "role": "tenant-user"
  }
}
```

---

### Tenants

#### POST /tenants

Create a new tenant. Requires `super-admin` role.

**Request:**
```json
{
  "name": "Acme Organization",
  "email": "admin@acme.org",
  "tier": "pro",
  "quotas": {
    "cpu": "4",
    "memory": "8Gi",
    "storage": "20Gi",
    "maxParticipants": 500
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "tenant-uuid",
  "name": "Acme Organization",
  "namespace": "tenant-acme-organization-1234567890",
  "email": "admin@acme.org",
  "status": "active",
  "tier": "pro",
  "quotas": {
    "cpu": "4",
    "memory": "8Gi",
    "storage": "20Gi",
    "maxParticipants": 500
  },
  "metadata": {
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "createdBy": "super-admin-uuid"
  },
  "settings": {}
}
```

#### GET /tenants

List all tenants. Requires `super-admin` role.

**Query Parameters:**
- `status` - Filter by status (active, suspended, pending)
- `tier` - Filter by tier (basic, pro, enterprise)

**Response:** `200 OK`
```json
{
  "tenants": [
    {
      "id": "tenant-uuid",
      "name": "Acme Organization",
      "namespace": "tenant-acme-organization-1234567890",
      "email": "admin@acme.org",
      "status": "active",
      "tier": "pro",
      "quotas": {...},
      "metadata": {...}
    }
  ],
  "total": 1
}
```

#### GET /tenants/:id

Get tenant details.

**Response:** `200 OK`
```json
{
  "id": "tenant-uuid",
  "name": "Acme Organization",
  "namespace": "tenant-acme-organization-1234567890",
  "email": "admin@acme.org",
  "status": "active",
  "tier": "pro",
  "quotas": {...},
  "metadata": {...},
  "settings": {}
}
```

#### PUT /tenants/:id

Update tenant. Requires `super-admin` or `tenant-admin` role.

**Request:**
```json
{
  "name": "Acme Corporation",
  "tier": "enterprise",
  "settings": {
    "customBranding": true
  }
}
```

**Response:** `200 OK`
```json
{
  "id": "tenant-uuid",
  "name": "Acme Corporation",
  ...
}
```

#### DELETE /tenants/:id

Delete tenant and all associated resources. Requires `super-admin` role.

**Response:** `204 No Content`

#### GET /tenants/:id/metrics

Get tenant resource usage metrics.

**Response:** `200 OK`
```json
{
  "tenant": {...},
  "metrics": {
    "totalParticipants": 45,
    "funnelDistribution": [
      { "stage": "mobilization", "count": 10 },
      { "stage": "acquisition", "count": 15 },
      { "stage": "verification", "count": 8 },
      { "stage": "retention", "count": 7 },
      { "stage": "graduation", "count": 3 },
      { "stage": "followup", "count": 2 }
    ],
    "quotaUsage": {
      "cpu": { "used": "0.5", "limit": "4" },
      "memory": { "used": "512Mi", "limit": "8Gi" },
      "storage": { "used": "2Gi", "limit": "20Gi" }
    }
  },
  "kubernetes": {
    "pods": {
      "total": 5,
      "running": 5
    },
    "services": 3,
    "pvcs": 2
  }
}
```

---

### Participants

#### POST /participants

Create a new participant.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "2005-03-15",
  "skills": ["programming", "design"]
}
```

**Response:** `201 Created`
```json
{
  "id": "participant-uuid",
  "tenantId": "tenant-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "dateOfBirth": "2005-03-15T00:00:00Z",
  "currentStage": "mobilization",
  "status": "active",
  "metadata": {
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "enrolledAt": "2024-01-15T10:30:00Z"
  },
  "skills": ["programming", "design"]
}
```

#### GET /participants

List participants for the authenticated tenant.

**Query Parameters:**
- `stage` - Filter by funnel stage
- `status` - Filter by status (active, inactive, graduated, dropped)

**Response:** `200 OK`
```json
{
  "participants": [
    {
      "id": "participant-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "currentStage": "mobilization",
      "status": "active",
      ...
    }
  ],
  "total": 1
}
```

#### GET /participants/:id

Get participant details.

**Response:** `200 OK`
```json
{
  "id": "participant-uuid",
  "tenantId": "tenant-uuid",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "currentStage": "acquisition",
  "status": "active",
  "metadata": {...},
  "skills": ["programming", "design"]
}
```

#### PUT /participants/:id

Update participant information.

**Request:**
```json
{
  "phone": "+9876543210",
  "skills": ["programming", "design", "leadership"]
}
```

**Response:** `200 OK`
```json
{
  "id": "participant-uuid",
  ...
}
```

#### DELETE /participants/:id

Delete participant. Requires `tenant-admin` role.

**Response:** `204 No Content`

#### GET /participants/:id/funnel

Get participant's funnel progress.

**Response:** `200 OK`
```json
{
  "participant": {
    "id": "participant-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "currentStage": "verification"
  },
  "funnelProgress": [
    {
      "id": "progress-uuid-1",
      "stage": "mobilization",
      "status": "completed",
      "startedAt": "2024-01-15T10:00:00Z",
      "completedAt": "2024-01-20T15:30:00Z",
      "data": {}
    },
    {
      "id": "progress-uuid-2",
      "stage": "acquisition",
      "status": "completed",
      "startedAt": "2024-01-20T15:30:00Z",
      "completedAt": "2024-01-25T14:00:00Z",
      "data": {}
    },
    {
      "id": "progress-uuid-3",
      "stage": "verification",
      "status": "in_progress",
      "startedAt": "2024-01-25T14:00:00Z",
      "completedAt": null,
      "data": {}
    }
  ],
  "currentStage": "verification"
}
```

#### POST /participants/:id/advance

Advance participant to next funnel stage.

**Request:**
```json
{
  "nextStage": "retention",
  "data": {
    "assessmentScore": 85,
    "notes": "Excellent progress in skills assessment"
  }
}
```

**Response:** `200 OK`
```json
{
  "id": "participant-uuid",
  "currentStage": "retention",
  ...
}
```

#### GET /participants/statistics

Get participant statistics by stage.

**Response:** `200 OK`
```json
{
  "currentDistribution": {
    "mobilization": 10,
    "acquisition": 15,
    "verification": 8,
    "retention": 7,
    "graduation": 3,
    "followup": 2
  },
  "stageMetrics": {
    "mobilization": {
      "total": 45,
      "completed": 35,
      "avgDurationSeconds": 432000
    },
    "acquisition": {
      "total": 35,
      "completed": 20,
      "avgDurationSeconds": 345600
    },
    ...
  }
}
```

---

### Funnel

#### GET /funnel/statistics

Get funnel conversion statistics for the authenticated tenant.

**Response:** `200 OK`
```json
{
  "currentDistribution": {
    "mobilization": 10,
    "acquisition": 15,
    "verification": 8,
    "retention": 7,
    "graduation": 3,
    "followup": 2
  },
  "stageMetrics": {
    "mobilization": {
      "total": 45,
      "completed": 35,
      "avgDurationSeconds": 432000
    },
    ...
  }
}
```

---

### Cost

#### GET /cost/report

Generate cost report for a tenant.

**Query Parameters:**
- `tenantId` - Tenant ID (super-admin only)
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)

**Response:** `200 OK`
```json
{
  "tenantId": "tenant-uuid",
  "tenantName": "Acme Organization",
  "namespace": "tenant-acme-organization-1234567890",
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "usage": {
    "cpu": "2.5 cores",
    "memory": "4.2 Gi",
    "storage": "12.5 Gi",
    "pods": 5,
    "pvcs": 2
  },
  "costs": {
    "cpu": 90.00,
    "memory": 30.24,
    "storage": 1.25,
    "total": 121.49
  },
  "tier": "pro",
  "quotas": {
    "cpu": "4",
    "memory": "8Gi",
    "storage": "20Gi"
  }
}
```

#### GET /cost/summary

Get cost summary for all tenants. Requires `super-admin` role.

**Response:** `200 OK`
```json
{
  "summary": [
    {
      "tenantId": "tenant-uuid-1",
      "tenantName": "Acme Organization",
      "namespace": "tenant-acme-org-123",
      "tier": "pro",
      "costs": {
        "total": 121.49
      }
    },
    {
      "tenantId": "tenant-uuid-2",
      "tenantName": "Beta Corp",
      "namespace": "tenant-beta-corp-456",
      "tier": "enterprise",
      "costs": {
        "total": 245.80
      }
    }
  ],
  "totalCost": 367.29,
  "totalTenants": 2,
  "generatedAt": "2024-01-31T12:00:00Z"
}
```

---

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "error": "Validation error message"
}
```

**401 Unauthorized:**
```json
{
  "error": "No authentication token provided"
}
```

**403 Forbidden:**
```json
{
  "error": "Insufficient permissions",
  "required": ["super-admin"],
  "current": "tenant-user"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error message"
}
```

---

## Rate Limiting

API requests are rate-limited per IP address:
- 100 requests per 15 minutes for authenticated requests
- 20 requests per 15 minutes for unauthenticated requests

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## Pagination

List endpoints support pagination via query parameters:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

## WebSocket API (Future)

Real-time updates will be available via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:3000/api/ws');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your-jwt-token'
}));

// Subscribe to tenant events
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'tenant:tenant-uuid'
}));

// Receive updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Create participant
const participant = await api.post('/participants', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});

// Get funnel statistics
const stats = await api.get('/funnel/statistics');
```

### Python

```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Create participant
response = requests.post(
    'http://localhost:3000/api/participants',
    headers=headers,
    json={
        'firstName': 'John',
        'lastName': 'Doe',
        'email': 'john@example.com'
    }
)

participant = response.json()
```

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Create participant
curl -X POST http://localhost:3000/api/participants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "firstName":"John",
    "lastName":"Doe",
    "email":"john@example.com"
  }'

# Get cost report
curl -X GET "http://localhost:3000/api/cost/report?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

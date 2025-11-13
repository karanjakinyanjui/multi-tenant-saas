import * as k8s from '@kubernetes/client-node';
import { Tenant } from '../models/Tenant';
import { logger } from '../utils/logger';

export class TenantService {
  private static k8sApi: k8s.CoreV1Api;
  private static rbacApi: k8s.RbacAuthorizationV1Api;
  private static networkingApi: k8s.NetworkingV1Api;
  private static appsApi: k8s.AppsV1Api;

  static initialize(): void {
    const kc = new k8s.KubeConfig();

    try {
      kc.loadFromCluster();
    } catch {
      kc.loadFromDefault();
    }

    this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    this.rbacApi = kc.makeApiClient(k8s.RbacAuthorizationV1Api);
    this.networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);
    this.appsApi = kc.makeApiClient(k8s.AppsV1Api);
  }

  static async provisionNamespace(tenant: Tenant): Promise<void> {
    try {
      logger.info(`Provisioning namespace for tenant: ${tenant.id}`);

      // Create namespace
      await this.createNamespace(tenant);

      // Create resource quotas
      await this.createResourceQuota(tenant);

      // Create network policies
      await this.createNetworkPolicy(tenant);

      // Create RBAC roles and bindings
      await this.createRBAC(tenant);

      // Deploy tenant database
      await this.deployDatabase(tenant);

      logger.info(`Namespace provisioned successfully: ${tenant.namespace}`);
    } catch (error) {
      logger.error(`Failed to provision namespace for tenant ${tenant.id}:`, error);
      throw error;
    }
  }

  private static async createNamespace(tenant: Tenant): Promise<void> {
    const namespace: k8s.V1Namespace = {
      metadata: {
        name: tenant.namespace,
        labels: {
          'app.kubernetes.io/managed-by': 'youth-saas-platform',
          'tenant-id': tenant.id,
          'tenant-tier': tenant.tier,
          'cost-center': tenant.id
        },
        annotations: {
          'tenant-name': tenant.name,
          'tenant-email': tenant.email
        }
      }
    };

    await this.k8sApi.createNamespace(namespace);
    logger.info(`Namespace created: ${tenant.namespace}`);
  }

  private static async createResourceQuota(tenant: Tenant): Promise<void> {
    const quota: k8s.V1ResourceQuota = {
      metadata: {
        name: 'tenant-quota',
        namespace: tenant.namespace
      },
      spec: {
        hard: {
          'requests.cpu': tenant.quotas.cpu,
          'requests.memory': tenant.quotas.memory,
          'requests.storage': tenant.quotas.storage,
          'persistentvolumeclaims': '5',
          'pods': '20',
          'services': '10'
        }
      }
    };

    await this.k8sApi.createNamespacedResourceQuota(tenant.namespace, quota);
    logger.info(`Resource quota created for: ${tenant.namespace}`);
  }

  private static async createNetworkPolicy(tenant: Tenant): Promise<void> {
    // Default deny all ingress
    const denyAllPolicy: k8s.V1NetworkPolicy = {
      metadata: {
        name: 'deny-all-ingress',
        namespace: tenant.namespace
      },
      spec: {
        podSelector: {},
        policyTypes: ['Ingress']
      }
    };

    await this.networkingApi.createNamespacedNetworkPolicy(tenant.namespace, denyAllPolicy);

    // Allow within namespace
    const allowInternalPolicy: k8s.V1NetworkPolicy = {
      metadata: {
        name: 'allow-internal',
        namespace: tenant.namespace
      },
      spec: {
        podSelector: {},
        policyTypes: ['Ingress'],
        ingress: [
          {
            from: [
              {
                podSelector: {}
              }
            ]
          }
        ]
      }
    };

    await this.networkingApi.createNamespacedNetworkPolicy(
      tenant.namespace,
      allowInternalPolicy
    );

    // Allow from monitoring namespace
    const allowMonitoringPolicy: k8s.V1NetworkPolicy = {
      metadata: {
        name: 'allow-monitoring',
        namespace: tenant.namespace
      },
      spec: {
        podSelector: {},
        policyTypes: ['Ingress'],
        ingress: [
          {
            from: [
              {
                namespaceSelector: {
                  matchLabels: {
                    name: 'monitoring'
                  }
                }
              }
            ]
          }
        ]
      }
    };

    await this.networkingApi.createNamespacedNetworkPolicy(
      tenant.namespace,
      allowMonitoringPolicy
    );

    logger.info(`Network policies created for: ${tenant.namespace}`);
  }

  private static async createRBAC(tenant: Tenant): Promise<void> {
    // Create tenant-admin role
    const adminRole: k8s.V1Role = {
      metadata: {
        name: 'tenant-admin',
        namespace: tenant.namespace
      },
      rules: [
        {
          apiGroups: ['', 'apps', 'batch'],
          resources: ['*'],
          verbs: ['*']
        }
      ]
    };

    await this.rbacApi.createNamespacedRole(tenant.namespace, adminRole);

    // Create tenant-user role (read-only)
    const userRole: k8s.V1Role = {
      metadata: {
        name: 'tenant-user',
        namespace: tenant.namespace
      },
      rules: [
        {
          apiGroups: ['', 'apps'],
          resources: ['pods', 'services', 'deployments'],
          verbs: ['get', 'list', 'watch']
        }
      ]
    };

    await this.rbacApi.createNamespacedRole(tenant.namespace, userRole);

    logger.info(`RBAC roles created for: ${tenant.namespace}`);
  }

  private static async deployDatabase(tenant: Tenant): Promise<void> {
    // Create PVC for database
    const pvc: k8s.V1PersistentVolumeClaim = {
      metadata: {
        name: 'postgres-pvc',
        namespace: tenant.namespace,
        labels: {
          'app': 'postgres',
          'tenant-id': tenant.id
        }
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: '5Gi'
          }
        }
      }
    };

    await this.k8sApi.createNamespacedPersistentVolumeClaim(tenant.namespace, pvc);

    // Create PostgreSQL deployment
    const deployment: k8s.V1Deployment = {
      metadata: {
        name: 'postgres',
        namespace: tenant.namespace,
        labels: {
          'app': 'postgres',
          'tenant-id': tenant.id
        }
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'postgres'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'postgres'
            }
          },
          spec: {
            securityContext: {
              runAsNonRoot: true,
              runAsUser: 999,
              fsGroup: 999
            },
            containers: [
              {
                name: 'postgres',
                image: 'postgres:15-alpine',
                env: [
                  {
                    name: 'POSTGRES_DB',
                    value: 'youth_saas'
                  },
                  {
                    name: 'POSTGRES_USER',
                    value: 'tenant_user'
                  },
                  {
                    name: 'POSTGRES_PASSWORD',
                    valueFrom: {
                      secretKeyRef: {
                        name: 'postgres-secret',
                        key: 'password'
                      }
                    }
                  }
                ],
                ports: [
                  {
                    containerPort: 5432,
                    name: 'postgres'
                  }
                ],
                volumeMounts: [
                  {
                    name: 'postgres-storage',
                    mountPath: '/var/lib/postgresql/data',
                    subPath: 'postgres'
                  }
                ],
                resources: {
                  requests: {
                    cpu: '100m',
                    memory: '256Mi'
                  },
                  limits: {
                    cpu: '500m',
                    memory: '512Mi'
                  }
                }
              }
            ],
            volumes: [
              {
                name: 'postgres-storage',
                persistentVolumeClaim: {
                  claimName: 'postgres-pvc'
                }
              }
            ]
          }
        }
      }
    };

    await this.appsApi.createNamespacedDeployment(tenant.namespace, deployment);

    // Create service
    const service: k8s.V1Service = {
      metadata: {
        name: 'postgres',
        namespace: tenant.namespace
      },
      spec: {
        selector: {
          app: 'postgres'
        },
        ports: [
          {
            port: 5432,
            targetPort: 5432 as any
          }
        ]
      }
    };

    await this.k8sApi.createNamespacedService(tenant.namespace, service);

    logger.info(`Database deployed for: ${tenant.namespace}`);
  }

  static async deprovisionNamespace(namespace: string): Promise<void> {
    try {
      logger.info(`Deprovisioning namespace: ${namespace}`);

      await this.k8sApi.deleteNamespace(namespace);

      logger.info(`Namespace deprovisioned: ${namespace}`);
    } catch (error) {
      logger.error(`Failed to deprovision namespace ${namespace}:`, error);
      throw error;
    }
  }

  static async getNamespaceMetrics(namespace: string): Promise<any> {
    try {
      const pods = await this.k8sApi.listNamespacedPod(namespace);
      const services = await this.k8sApi.listNamespacedService(namespace);
      const pvcs = await this.k8sApi.listNamespacedPersistentVolumeClaim(namespace);

      return {
        pods: {
          total: pods.body.items.length,
          running: pods.body.items.filter(p => p.status?.phase === 'Running').length
        },
        services: services.body.items.length,
        pvcs: pvcs.body.items.length
      };
    } catch (error) {
      logger.error(`Failed to get metrics for namespace ${namespace}:`, error);
      return null;
    }
  }
}

// Initialize on module load
TenantService.initialize();

# Kubernetes Scale-Out Infrastructure Report

## Summary

The manifests in `/home/ubuntu` were updated so the frontend and backend can scale out in a more standard Kubernetes pattern without depending on node-level traffic exposure.

The new baseline uses:

- multi-replica `Deployment`
- `ClusterIP` Services
- AWS ALB Ingress with `target-type: ip`
- `HorizontalPodAutoscaler`
- `PodDisruptionBudget`
- startup, readiness, and liveness probes
- CPU and memory requests/limits

## Applied Design

### Frontend and backend deployment model

The app now follows this path:

`ALB -> Ingress -> ClusterIP Service -> multiple pods`

This removes the need for `NodePort`-based ingress routing and makes scale-out behavior more predictable.

### Backend deployment updates

File: [backend-deployment.yaml](/home/ubuntu/backend-deployment.yaml)

- increased replicas from `1` to `2`
- replaced `Recreate` with `RollingUpdate`
- added anti-affinity preference so replicas spread across nodes when possible
- added `startupProbe`, `readinessProbe`, and `livenessProbe`
- added resource requests and limits
- added a basic container security context

File: [backend-service.yaml](/home/ubuntu/backend-service.yaml)

- changed Service type from `NodePort` to `ClusterIP`
- switched to a named target port

### Frontend deployment updates

File: [frontend-deployment.yaml](/home/ubuntu/frontend-deployment.yaml)

- kept `2` replicas as the baseline
- added rolling update settings
- added anti-affinity preference
- added HTTP readiness/liveness probes
- added resource requests and limits
- added a basic container security context

File: [frontend-service.yaml](/home/ubuntu/frontend-service.yaml)

- changed Service type from `NodePort` to `ClusterIP`

### Ingress updates

Files:

- [app-ingress.yaml](/home/ubuntu/app-ingress.yaml)
- [ingress-https.yaml](/home/ubuntu/ingress-https.yaml)

Both now reflect the same intended ingress design:

- `find.me.kr -> frontend`
- `api.find.me.kr -> backend`
- ALB `target-type` changed from `instance` to `ip`

The ALB success code range was widened to `200-404` as a temporary compatibility measure because the backend does not yet have a confirmed HTTP health endpoint for ALB health checks.

## Added Files

- [backend-hpa.yaml](/home/ubuntu/backend-hpa.yaml)
- [frontend-hpa.yaml](/home/ubuntu/frontend-hpa.yaml)
- [app-pdb.yaml](/home/ubuntu/app-pdb.yaml)

## Why This Is Better For Scale-Out

- multiple replicas can serve traffic behind the same Service
- rolling deployments no longer require full replacement downtime
- ALB can route directly to pod IPs instead of node ports
- PDB helps keep at least one pod available during drains or maintenance
- HPA has resource requests it can scale against

## Important Caveats

### 1. HPA will not work immediately

`kubectl top nodes` currently returns `Metrics API not available`.

That means `metrics-server` is not ready in the cluster, so the HPA manifests are prepared but will not function until metrics are available.

### 2. Backend DB connectivity is still a blocker

The earlier `CrashLoopBackOff` on the `dev` backend was caused by database connection failure during Spring Boot startup.

These infrastructure changes improve rollout and scale-out, but they do not fix an incorrect RDS endpoint, credential problem, or broken pod-to-RDS path.

### 3. Backend health API should still be added

To avoid blocking rollout, backend probes were implemented with `tcpSocket`.

Recommended next step:

- add `/actuator/health` or an equivalent endpoint
- switch backend probes to `httpGet`
- narrow ALB health success codes back to `200`

## Suggested Apply Order

```bash
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml
kubectl apply -f ingress-https.yaml
kubectl apply -f app-pdb.yaml
kubectl apply -f backend-hpa.yaml
kubectl apply -f frontend-hpa.yaml
```

## Expected Outcome

After DB connectivity is fixed and `metrics-server` is installed:

- frontend should scale horizontally behind ALB
- backend should scale horizontally behind ALB
- rollouts should be safer and less disruptive
- node maintenance should be less likely to take the full service down

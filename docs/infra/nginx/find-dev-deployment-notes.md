# Find Dev Server Routing Notes

Last updated: 2026-04-28 UTC

## Summary

Development traffic is routed directly on the `worker-ssafy` node through host Nginx, without going through an ALB.

Current entrypoints:

| URL | Target | Notes |
| --- | --- | --- |
| `https://dev.find.me.kr` | frontend | Main dev frontend |
| `https://dev.find.me.kr/api` | backend | Path-based proxy to backend |
| `https://dev.api.find.me.kr` | backend | Dedicated backend dev domain |

This dev environment is intentionally reachable through Tailscale. A client machine must be connected to the same Tailscale tailnet to use these domains.

## Access Model

The public DNS records currently resolve to the Tailscale IP of `worker-ssafy`:

```text
dev.find.me.kr      A 100.114.155.48
dev.api.find.me.kr  A 100.114.155.48
```

`100.114.155.48` is not a normal public internet address. It is the Tailscale IP of `worker-ssafy`.

What this means:

| Client | Expected result |
| --- | --- |
| Team member with Tailscale connected to the same tailnet | Can access dev domains |
| Team member with Tailscale disconnected | Cannot access dev domains |
| Random public internet user | Cannot access dev domains |

Current Tailscale details:

```text
worker-ssafy Tailscale IP: 100.114.155.48
MagicDNS name: worker-ssafy.tail4d2ec7.ts.net.
Tailnet user/org: arin.kim0801@gmail.com
```

Kubernetes on `worker-ssafy` also uses the Tailscale IP as the node IP:

```text
kubelet --hostname-override=worker-ssafy --node-ip=100.114.155.48
```

Do not stop or remove Tailscale casually. The worker node may become unreachable from the master while Tailscale is down.

## Kubernetes Services

Namespace: `dev`

Current Service NodePorts:

| Service | Port | NodePort | Purpose |
| --- | ---: | ---: | --- |
| `frontend` | `80` | `30116` | frontend HTTP |
| `backend` | `8080` | `32220` | backend HTTP API |
| `backend` | `18081` | `31269` | monitoring |

Useful check:

```bash
sudo kubectl --kubeconfig=/etc/kubernetes/kubelet.conf get svc -n dev frontend backend -o yaml
```

The live Service specs contain the NodePort values above. However, `last-applied-configuration` did not include explicit `nodePort` values when checked. If the Services are deleted and recreated, these ports can change unless the source manifests explicitly set them.

Recommended follow-up:

```yaml
nodePort: 30116 # frontend
nodePort: 32220 # backend http
nodePort: 31269 # backend monitoring, if needed
```

## Nginx

Nginx runs directly on the `worker-ssafy` host.

Important files:

```text
/etc/nginx/sites-available/find-dev
/etc/nginx/sites-enabled/find-dev -> /etc/nginx/sites-available/find-dev
/etc/nginx/sites-available/find-dev.bak-20260428-https
```

Current behavior:

```text
HTTP 80  -> redirects to HTTPS
HTTPS 443 dev.find.me.kr      -> frontend NodePort 30116
HTTPS 443 dev.find.me.kr/api  -> backend NodePort 32220
HTTPS 443 dev.api.find.me.kr  -> backend NodePort 32220
```

Verification commands:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo ss -lntp | grep ':443 '
```

Expected checks:

```bash
curl -i http://dev.find.me.kr/
curl -i https://dev.find.me.kr/
curl -i https://dev.find.me.kr/api
curl -i https://dev.api.find.me.kr/
```

Observed results after HTTPS setup:

```text
http://dev.find.me.kr/       -> 301 https://dev.find.me.kr/
https://dev.find.me.kr/      -> frontend HTML 200
https://dev.find.me.kr/api   -> backend response, currently 302 to /
https://dev.api.find.me.kr/  -> backend OK 200
```

The `/api` 302 is from the backend application, not from Nginx. Direct calls to backend NodePort showed the same behavior.

## TLS Certificate

Certificate was issued successfully with Certbot DNS-01 manual validation.

Certificate paths:

```text
/etc/letsencrypt/live/find-dev/fullchain.pem
/etc/letsencrypt/live/find-dev/privkey.pem
```

Expiration:

```text
2026-07-27
```

Important: this certificate will not renew automatically because it was issued using Certbot `--manual` DNS validation without auth hooks.

## Certificate Renewal Runbook

Run before `2026-07-27`.

Start renewal:

```bash
sudo certbot certonly --manual --preferred-challenges dns \
  --cert-name find-dev \
  -d dev.find.me.kr \
  -d dev.api.find.me.kr
```

Certbot will print one TXT record per domain. Add the TXT records in Gabia DNS.

For `dev.find.me.kr`:

```text
Type: TXT
Host: _acme-challenge.dev
Value: <value printed by Certbot for dev.find.me.kr>
TTL: 600
```

For `dev.api.find.me.kr`:

```text
Type: TXT
Host: _acme-challenge.dev.api
Value: <value printed by Certbot for dev.api.find.me.kr>
TTL: 600
```

In Gabia, pressing `확인` is not enough. Make sure to press the final `저장` button so the DNS zone is actually published.

Before pressing Enter in the Certbot terminal, verify both TXT records are visible:

```bash
nslookup -type=TXT _acme-challenge.dev.find.me.kr 8.8.8.8
nslookup -type=TXT _acme-challenge.dev.api.find.me.kr 8.8.8.8
```

Both commands must return the exact values printed by the current Certbot run.

After Certbot succeeds:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Then verify:

```bash
curl -i https://dev.find.me.kr/
curl -i https://dev.api.find.me.kr/
```

## Gabia DNS Notes

The authoritative nameservers for `find.me.kr` are Gabia nameservers:

```text
ns.gabia.net
ns.gabia.co.kr
ns1.gabia.co.kr
```

Useful DNS checks:

```bash
nslookup -type=NS find.me.kr 8.8.8.8
nslookup dev.find.me.kr 8.8.8.8
nslookup dev.api.find.me.kr 8.8.8.8
nslookup -type=TXT _acme-challenge.dev.find.me.kr 8.8.8.8
nslookup -type=TXT _acme-challenge.dev.api.find.me.kr 8.8.8.8
```

If Certbot reports `NXDOMAIN looking up TXT`, the TXT record is not visible to public DNS yet. Check:

1. The record was added under the `find.me.kr` zone.
2. The host field is correct.
3. The final Gabia `저장` button was pressed.
4. The TXT value is from the current Certbot run, not an older failed run.
5. Enough time has passed for DNS propagation.

## OAuth Notes

OAuth testing should use HTTPS URLs now.

Common redirect URI candidates:

```text
https://dev.find.me.kr/<oauth-callback-path>
https://dev.api.find.me.kr/<oauth-callback-path>
```

The exact callback path depends on the backend security configuration. OAuth provider consoles usually require an exact match including:

```text
scheme: https
host: dev.find.me.kr or dev.api.find.me.kr
path: exact callback path
```

The browser used for testing must also be connected to the same Tailscale tailnet, because both dev domains resolve to `100.114.155.48`.

## Public IP And NodePort Notes

`http://3.35.17.97:30116/` can reach the frontend because `30116` is the Kubernetes frontend NodePort.

That path bypasses Nginx:

```text
browser -> 3.35.17.97:30116 -> Kubernetes NodePort -> frontend Pod
```

The desired dev-domain path is:

```text
browser -> dev.find.me.kr:443 -> worker-ssafy Nginx -> 127.0.0.1:30116 -> frontend Pod
```

For a private dev environment, direct public NodePort access should ideally be blocked at the cloud/security-group/firewall layer. Otherwise users may bypass the intended Tailscale/Nginx entrypoint.

Public port 80 on `3.35.17.97` was previously not connected to `worker-ssafy` Nginx. That is why `dev.find.me.kr -> 3.35.17.97` did not work as a public HTTP setup. The current design avoids that by using Tailscale DNS targets instead.

## Operational Checklist

When something breaks, check in this order:

1. Is the client connected to Tailscale?
2. Does DNS resolve to `100.114.155.48`?
3. Is Nginx listening on 443?
4. Is the certificate still valid?
5. Are NodePorts still `30116` and `32220`?
6. Are frontend/backend Pods healthy in namespace `dev`?
7. Is the backend returning a redirect or error by itself?

Useful commands:

```bash
tailscale status
tailscale ip -4
getent ahostsv4 dev.find.me.kr
getent ahostsv4 dev.api.find.me.kr
sudo nginx -t
sudo systemctl status nginx
sudo ss -lntp | grep -E ':80 |:443 '
sudo kubectl --kubeconfig=/etc/kubernetes/kubelet.conf get svc -n dev frontend backend -o wide
```


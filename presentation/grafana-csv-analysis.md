# Grafana CSV analysis

## Source

- Dashboard: `Node Exporter Full`
- Datasource: Prometheus / node_exporter
- Node shown in the screenshot: `worker1`
- Instance shown in the screenshot: `172.31.52.126:9100`
- Exported files:
  - `CPU Basic-data-2026-05-18 12_20_55.csv`
  - `Memory Basic-data-2026-05-18 12_37_28.csv`
  - `Network Traffic Basic-data-2026-05-18 12_37_37.csv`
  - `Disk Space Used Basic-data-2026-05-18 12_37_45.csv`

## Caveat

These CSV files contain one series per panel, not every line shown in each Grafana graph.

Examples:

- `CPU Basic` export contains only `Busy System`, not `Busy User`, `Busy Iowait`, `Idle`, etc.
- `Memory Basic` export contains only `Total`, not `Used`, `Cache + Buffer`, `Free`, `Swap used`.
- `Network Traffic Basic` export contains only `Rx br-9b425f4d2008`, not every interface and transmit series.
- `Disk Space Used Basic` export contains only `/boot/efi`, not root `/` or every mountpoint.

So this data is useful as monitoring evidence, but it should not be presented as the complete infrastructure metric set.

## Extracted Metrics

| Panel export | Series | Range | Rows | Average | P50 | P95 | Max |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| CPU Basic | Busy System | 2026-04-29 14:00:00 -> 2026-05-18 12:30:00 | 910 | 1.12% | 1.06% | 1.45% | 5.98% |
| Memory Basic | Total | 2026-04-29 14:00:00 -> 2026-05-18 12:30:00 | 909 | 7.60 GiB | 7.60 GiB | 7.60 GiB | 7.60 GiB |
| Network Traffic Basic | Rx br-9b425f4d2008 | 2026-04-29 14:00:00 -> 2026-05-18 13:00:00 | 911 | 487.8 b/s | 273.0 b/s | 1.84 kb/s | 22.1 kb/s |
| Disk Space Used Basic | /boot/efi | 2026-04-29 14:00:00 -> 2026-05-18 12:30:00 | 909 | 5.85% | 5.85% | 5.85% | 5.85% |

Peak timestamps:

- CPU `Busy System` max: 5.98% at `2026-05-11 12:00:00`
- Network `Rx br-9b425f4d2008` max: 22.1 kb/s at `2026-05-11 21:00:00`

## Presentation Use

Safe wording:

> Prometheus node_exporter and Grafana were used to observe Linux node-level health. For the exported worker1 sample, system CPU stayed low across the observed period, memory capacity was stable at 7.60 GiB, and the exported boot partition usage was unchanged at 5.85%. This supports the point that the team had node-level monitoring in place, but it is not enough by itself to explain application traffic or user behavior.

Do not claim from these CSVs:

- Total CPU utilization for the whole node
- Actual application request traffic
- Kubernetes pod-level CPU/memory
- ALB/RDS/S3/AWS managed service health
- User count, session count, or chapter completion

## Better Extra Exports

For a stronger infrastructure slide, export these as CSV:

- `CPU Busy`
- `RAM Used`
- `Root FS Used`
- `System Load`
- `OOM Killer`
- `Node Exporter Scrape`

For a service operation slide, export these from the relevant dashboards instead:

- HTTP request count
- HTTP error rate
- API latency
- Pod CPU/memory/restart count
- ALB 4xx/5xx and target response time
- RDS CPU/connections/storage

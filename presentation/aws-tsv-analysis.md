# AWS CloudWatch TSV analysis

## Source

Exported CloudWatch metrics:

- `master_cpu.tsv`: EC2 `CPUUtilization`, hourly `Average` and `Maximum`
- `worker1_cpu.tsv`: EC2 `CPUUtilization`, hourly `Average` and `Maximum`
- `alb_request_count.tsv`: Application Load Balancer `RequestCount`, hourly `Sum`
- `alb_response_time.tsv`: Application Load Balancer `TargetResponseTime`, hourly `Average` and `Maximum`
- `alb_5xx.tsv`: Application Load Balancer `HTTPCode_ELB_5XX_Count`, hourly `Sum`

Range:

- CPU / ALB request / ALB response: `2026-04-29T09:00:00+09:00` -> `2026-05-18T12:00:00+09:00`
- ALB 5xx file contains only non-zero datapoints: `2026-04-29T12:00:00+09:00` -> `2026-05-16T15:00:00+09:00`

## Summary

| Metric | Count | Average | P50 | P95 | Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| master EC2 CPU Average | 460 | 4.26% | 4.19% | 5.09% | 11.61% |
| master EC2 CPU Maximum | 460 | 6.05% | 4.91% | 11.18% | 53.66% |
| worker1 EC2 CPU Average | 460 | 5.11% | 4.84% | 6.43% | 30.11% |
| worker1 EC2 CPU Maximum | 460 | 8.96% | 5.24% | 26.10% | 100.00% |
| ALB RequestCount | 460 | 327.18/hour | 248/hour | 688/hour | 3,467/hour |
| ALB TargetResponseTime Average | 460 | 0.03s | 0.00s | 0.24s | 1.99s |
| ALB TargetResponseTime Maximum | 460 | 2.26s | 0.00s | 19.14s | 50.50s |
| ALB ELB 5xx Count | 12 non-zero hours | 10.00/non-zero hour | 2 | 17 | 68 |

Combined:

- Total ALB requests: `150,503`
- Total ALB ELB 5xx: `120`
- ALB ELB 5xx rate: `0.0797%`
- Request-weighted ALB target response average: `0.0739s`

## Peak Times

CPU:

- master hourly average CPU max: `11.61%` at `2026-04-29T12:00:00+09:00`
- master hourly maximum CPU max: `53.66%` at `2026-04-29T12:00:00+09:00`
- worker1 hourly average CPU max: `30.11%` at `2026-04-29T11:00:00+09:00`
- worker1 hourly maximum CPU max: `100.00%` at `2026-05-11T22:00:00+09:00`

ALB:

- peak request hour: `3,467` requests at `2026-05-04T14:00:00+09:00`
- highest hourly average response time: `1.9873s` at `2026-04-29T11:00:00+09:00`
- highest target response max: `50.5047s` at `2026-04-29T10:00:00+09:00`
- highest ELB 5xx hour: `68` at `2026-04-29T12:00:00+09:00`

Top request days:

| Date | Requests | Peak hour |
| --- | ---: | ---: |
| 2026-05-04 | 13,241 | 3,467 |
| 2026-05-12 | 11,714 | 2,641 |
| 2026-05-16 | 10,126 | 1,307 |
| 2026-05-15 | 9,580 | 1,030 |
| 2026-04-30 | 8,177 | 779 |

Top 5xx days:

| Date | ELB 5xx | Peak hour |
| --- | ---: | ---: |
| 2026-04-29 | 68 | 68 |
| 2026-05-16 | 17 | 17 |
| 2026-05-11 | 13 | 13 |
| 2026-05-04 | 7 | 7 |
| 2026-05-02 | 6 | 3 |

## Presentation Use

Safe wording:

> CloudWatch ALB metrics show that the service handled 150,503 requests during the exported period. The ALB-side 5xx count was 120, about 0.08% of requests, and the request-weighted target response average was about 74 ms. EC2 CPU stayed low on average, with master at 4.26% and worker1 at 5.11%, though worker1 had a short 100% maximum spike on May 11.

What this supports:

- The service had real external traffic, not only local testing.
- ALB-level request, response-time, and 5xx monitoring were available.
- EC2 CPU was not a sustained bottleneck in the exported window.
- A few spike hours existed and can be used as examples of why monitoring was needed.

Do not overclaim:

- `HTTPCode_ELB_5XX_Count` is ALB-generated 5xx, not target/application 5xx.
- These files do not include 4xx, target 5xx, pod restarts, RDS, or user behavior.
- Daily totals for `2026-04-29` and `2026-05-18` are partial days because the export starts/ends mid-day.

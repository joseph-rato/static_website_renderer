# Wildcard Domain Security & Cost Mitigation

This note outlines how we can protect the `*.pagoda.site` / `*.getpagoda.site` setup (and custom domains) from abuse, especially brute-force host attacks that could inflate Lambda@Edge costs.

## 1. Built-in Protections (Free)

| Layer             | Protection                      | Notes                                                                                                                                                                      |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Network (L3/L4)   | **AWS Shield Standard**         | Enabled automatically on CloudFront/Route 53. Blocks volumetric TCP/UDP floods without extra cost.                                                                         |
| Application logic | **Lambda@Edge guard clauses**   | We can reject invalid hosts immediately and return cached 403/404 responses. This keeps bogus subdomains from hitting S3 or incurring repeated Lambda@Edge execution cost. |
| Application logic | **Allowlist / validation**      | Maintain a set of valid slugs; reject anything unexpected. Keeps randomly generated hosts from succeeding.                                                                 |
| Application logic | **Short negative-response TTL** | Respond to unknown hosts with cacheable 403 so CloudFront doesn’t keep invoking the Lambda.                                                                                |

Implementation ideas for the edge function guard:

```python
ALLOWED_SUFFIXES = {"getpagoda.site", "pagoda.site"}

if not any(host.endswith(suffix) for suffix in ALLOWED_SUFFIXES):
    return {
        "status": "403",
        "statusDescription": "Forbidden",
        "headers": {"cache-control": [{"key": "Cache-Control", "value": "max-age=300"}]},
        "body": "Invalid host"
    }

# optionally: allowlist of slugs pulled from DB/cache.
```

## 2. AWS WAF (Paid)

| Feature               | Pricing                                                                     | What it buys us                                                                       |
| --------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Web ACL on CloudFront | $5/month per ACL + $1/month per rule + $0.60 per million requests inspected | Layer 7 rate limiting and bot mitigation. Blocks abusive IPs before Lambda@Edge runs. |
| Managed rule groups   | ~$1–$10/month per group                                                     | Optional prebuilt rules for OWASP, bot detection, etc.                                |

Recommended when: you expect hostile traffic or want automated rate limiting. Basic config: rate-based rule blocking IPs that exceed a threshold, plus optional bot control.

## 3. AWS Shield Advanced (Premium)

| Feature             | Pricing      | Notes                                                                                                                                                |
| ------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS Shield Advanced | $3,000/month | Includes managed DDoS response team, additional reporting, and covers cost overruns due to DDoS (requires Shield engagement). WAF usage is included. |

Only necessary for high-risk targets. Shield Advanced would include 24/7 DDoS response and cost protection, but it’s pricey.

## 4. Custom Throttling Patterns

- **Rate limiting in code**: maintain a lightweight counter (e.g., in DynamoDB) keyed by IP or host; return 429 when thresholds exceed. Use carefully to avoid added latency.
- **Preview vs production segregation**: serve preview domains using `--preview.getpagoda.site` format from a separate distribution, keeping customer-facing traffic isolated.
- **Monitoring/alerts**: configure CloudWatch alarms on Lambda@Edge invocation counts, WAF rule hits, and CloudFront 4xx/5xx metrics; create budget alerts for unexpected spend.

## Summary of Options

| Option                                    | Monthly Cost       | Pros                                                 | Cons                                               |
| ----------------------------------------- | ------------------ | ---------------------------------------------------- | -------------------------------------------------- |
| Shield Standard + Lambda@Edge guard logic | $0 extra           | Blocks L3/L4 attacks; code-based 403 reduces misuse. | No built-in rate limiting; manual tuning required. |
| Shield Standard + AWS WAF (rate rules)    | ~$10 + per-request | Automatic rate limits/bot mitigation.                | Adds WAF charges.                                  |
| Shield Advanced                           | $3,000             | Managed DDoS support, cost protection, WAF included. | Expensive; rarely needed for SMB app.              |

Recommendation: Start with Shield Standard + code guardrails (return cached 403 for unknown hosts). Add WAF rate rules if traffic volume or threat level warrants it. Shield Advanced only if contractual or regulatory requirements demand it.

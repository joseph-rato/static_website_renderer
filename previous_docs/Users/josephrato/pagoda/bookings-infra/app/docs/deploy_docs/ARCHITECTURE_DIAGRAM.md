# Deploy Refactor Architecture Summary

https://app.diagrams.net/?src=about#G1hVORAe_jxu77I_JPeYbfxVjCYs0wcuDs#%7B%22pageId%22%3A%22wJ2TLyjxhgm-KUCGFAtY%22%7D

Each box corresponds to code or data managed in this refactor.

## Document Index

- `BUILT_IN_DOMAIN_BRAINSTORM.md` — Built-in vs custom domain ideas, validation considerations.
- `DEPLOY_BRAINSTORM.md` — Legacy pricing/option analysis kept for historical reference.
- `DEPLOY_IMPLEMENTATION.md` — Snapshot of the original deploy lambda (pre-refactor).
- `DEPLOYMENT_VS_UPDATES.md` — Conceptual separation of rebuild (content) vs deploy (infrastructure) workflows.
- `STRUCTURE_OUTLINE.md` — Target folder/file layout.
- `DEPLOYMENT_ROADMAP.md` — Multi-phase rollout/PR plan.
- `execution_plans/` — Endpoint + migration execution plans (register-domain, deploy-status, list-domains, rebuild, built-in domains, migrations).
- `lambda_execution_plans/` — Per-lambda plans (API functions, repository helpers, Lambda@Edge router).
- `wildcard_security.md` — DDoS mitigation options (Shield, WAF, code throttling).

```

```

---
title: Internal API Gateway & Auth Service
summary: Centralized service gateway with JWT-based authentication and GraphQL contract layer for internal service communication.
date: 2025-11-10
domain: platform
status: shipped
featured: false
---

## Context

Internal services had grown organically, with each team creating direct database connections and point-to-point API calls. This created a web of dependencies: changing a database schema required coordinating with every service that accessed it. Authentication was inconsistent—some services used shared secrets, others had no auth at all.

**Role:** Designed and implemented the gateway architecture, auth model, and initial GraphQL schema; led migration of internal services onto the gateway.

**Constraints:**
- Must not require rewriting existing services
- Need to support both human developers (debugging, testing) and service-to-service calls
- Schema changes in underlying services shouldn't break consumers
- Zero-trust model: services shouldn't have direct database access

## System Overview

![Internal API Gateway diagram](../../assets/diagrams/internal-api-gateway.png)


The gateway sits between all internal services and their dependencies. It authenticates requests, routes them to the appropriate backend, and exposes a stable GraphQL interface that abstracts internal data models.

Services call the gateway instead of each other or databases directly. The gateway handles auth, rate limiting, and request translation. Backend implementations can change without updating every consumer.

## Key Components

- **API Gateway Core**: Request router that handles ingress, authentication, and dispatch to backend services. Stateless and horizontally scalable.

- **Two-Tier Auth Model**: Development uses JWT tokens for rapid iteration—developers can self-issue short-lived tokens for testing without DevOps involvement. Production services authenticate via API keys managed through the gateway admin interface, giving DevOps control over production credentials and rate limits.

- **GraphQL Contract Layer**: Exposes a unified schema over internal data sources. Resolvers translate between the public schema and internal APIs. Backward compatibility is maintained via field deprecation and additive-only schema changes; breaking changes require versioned entry points.

- **Scope & Permission System**: Each token carries scopes that limit what operations and data it can access. Services request only the scopes they need. The gateway enforces boundaries.

- **Backend Adapters**: Translation layer between the GraphQL schema and actual backend implementations (databases, internal APIs, third-party services). Backends can be swapped without schema changes.

## Critical Design Decisions

**Gateway over service mesh.** A service mesh would have been more flexible but required significant infrastructure changes and team training. A gateway provided 80% of the value with 20% of the complexity for our team size.

**GraphQL over REST aggregation.** Considered a REST gateway that aggregated multiple backend calls, but GraphQL's typed schema and client-driven queries reduced overfetching and made the contract explicit.

**Two-tier auth over single mechanism.** Developers need fast, self-service access during development; production needs controlled, auditable credentials. JWT for dev keeps engineers unblocked. API keys for production keeps DevOps in control of what runs in prod.

**Scoped access over role-based.** Roles were too coarse for service-to-service auth. A service that needs to read user profiles shouldn't automatically be able to modify them. Fine-grained scopes enforce least privilege.

## Tradeoffs & Limitations

**Single point of failure.** The gateway is on the critical path for all internal communication. Requires high availability design and careful capacity planning.

**Added latency for every internal call.** Every request now has an extra hop (~5–15ms depending on resolver path). For latency-sensitive paths, this overhead is measurable. Caching and connection pooling mitigate but don't eliminate it.

**Schema evolution requires coordination.** While backends can change independently, GraphQL schema changes still need versioning strategy and consumer communication.

**Debugging is harder.** When something fails, the error might originate in the gateway, the backend, or the translation layer. Distributed tracing became essential.

## Outcomes

- Eliminated direct database access from application services
- Reduced inter-service auth inconsistencies from "dozens of patterns" to one
- Backend teams can refactor internal implementations without coordinating with every consumer
- New services onboard in 4–6 hours instead of 2–3 days (no custom auth integration needed)

The gateway became the default way services communicate, replacing ad-hoc patterns.

## Evolution Notes

**What changed:** As traffic grew and team ownership became clearer, split the initial monolithic gateway into domain-specific instances (user data, content, infrastructure) to reduce blast radius and allow independent scaling.

**What would be revisited:** The GraphQL schema has grown complex and would benefit from federation, allowing each domain team to own their portion of the schema.

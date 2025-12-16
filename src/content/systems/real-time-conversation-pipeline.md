---
title: Real-Time Conversation Pipeline
summary: WebSocket ingestion pipeline that normalizes live chat events and maintains fast, in-memory conversation state for downstream consumers.
date: 2025-12-01
domain: infrastructure
status: shipped
featured: true
---

## Context

Live chat data arrives as a continuous WebSocket event stream. Multiple downstream systems (dashboards, automation, analytics) need fast access to *current* conversation state, not raw events. Previously, each system parsed WebSocket messages independently, causing duplicated logic, inconsistent interpretations, and race conditions.

The goal of this system is to centralize ingestion and state derivation while keeping the hot path lightweight and memory-bounded.

**Constraints:**
- High fan-out WebSocket traffic
- Sub-second access to current conversation state
- No requirement for durable historical storage on the hot path
- Clear separation between ingestion, fanout, and state access

## System Overview

![Real-Time Conversation Pipeline diagram](../../assets/diagrams/realtime-conversation-pipeline-diagram.png)

The pipeline ingests raw WebSocket events, normalizes them into a shared event format, and publishes them to a pub/sub topic. A dedicated subscriber consumes these events and materializes multiple in-memory views of conversation state in Redis.

Downstream consumers never parse raw WebSocket events. They read from Redis, which serves as the single source of truth for live conversation state.

## Architecture Alignment

This document describes **exactly** the architecture shown in the diagram:

- WebSocket ingestion is stateless and event-focused
- Pub/Sub is the system boundary between ingestion and state materialization
- Redis stores multiple logical datasets, not just a single snapshot
- No outbound REST polling or API fanout exists in this path

## Key Components

### WebSocket Ingestion Service
Consumes live OnlyFans WebSocket events and normalizes them into a common event schema. Handles connection lifecycle, retries, and backpressure. Does **not** maintain conversation state.

### Pub/Sub Topic
Acts as the decoupling boundary. All normalized events are published once and can be consumed by any number of subscribers without coordination.

### Redis Snapshot Service
A dedicated Pub/Sub subscriber responsible for materializing conversation state. This service is the *only* writer to Redis for live chat data.

### Redis (Memorystore)
Stores three distinct logical datasets:
- **All WebSocket events for high-value fans** for deeper inspection and automation
- **Priority feed** for latency-sensitive workflows

Redis is used strictly for hot, ephemeral state with bounded memory and TTL-based eviction.

### Firestore
Stores two distinct logical datasets:
- **Chat Message History** for llm-based workflows and analysis downstream
- **Fan Summary** denormalized to minimize read amplification

Firestore is used strictly for durable, document-based state with explicit retention policies (TTL where applicable) and query/index constraints to keep storage and read costs bounded.

### Auth Automation Infrastructure
Provides authenticated session material required for WebSocket connections. Auth artifacts are prepared asynchronously and loaded by ingestion workers at startup.

### Dashboard
Reads directly from Redis. It never consumes Pub/Sub or raw WebSocket events.

## Critical Design Decisions

**Centralized state materialization.** Only one service is responsible for converting events into state. This eliminates divergence and simplifies downstream consumers.

**Multiple logical views in Redis.** Rather than forcing all consumers into a single data shape, Redis stores purpose-built datasets optimized for different access patterns.

**Pub/Sub as the ingestion boundary.** Ingestion and state derivation scale independently. Failures or backpressure in Redis snapshotting do not impact WebSocket connectivity.

**No historical guarantees.** Redis is not a source of record. Anything requiring history must consume events elsewhere.

## Tradeoffs & Limitations

- High-value fan filtering happens before deep storage
- Missed Pub/Sub events require consumers to reconcile from Redis
- Single-region design simplifies latency but limits redundancy

## Outcomes

- One canonical live conversation state
- Zero duplicated WebSocket parsing logic
- Sub-second reads for UI and automation
- Clear operational boundaries between ingestion, fanout, and state

This pipeline is the anchor for all real-time features built on top of chat data.

---
title: Fan Engagement Automation Platform
summary: Event-driven automation platform that evaluates real-time behavioral signals, applies safety guardrails, and dispatches engagement actions through a reliable, auditable pipeline.
date: 2025-08-05
domain: platform
status: shipped
featured: true
---

## Context

Creators generate high-volume, high-variance interaction data, including messages, purchases, inactivity signals, and failed conversion attempts. This data needs to be acted on quickly to maintain engagement, but incorrect or poorly timed automation can cause spam, mishandle sensitive situations, or create irreversible trust issues.

Manual handling does not scale, while naive automation lacks the safety and observability required for real-world operation.

**Constraints:**
- Thousands of concurrent conversations per creator
- Strict deduplication and ordering guarantees
- Safety-first escalation for ambiguous or sensitive situations
- Automation must be interruptible and observable
- Partial failures must not cascade across the system

These constraints required a data-first, event-driven platform rather than a monolithic bot or synchronous workflow engine.

## System Overview

![Automation Messaging Layer diagram](/diagrams/automation-messaging-layer.png)

The platform is structured as an asynchronous, multi-stage event pipeline:

- Primary Data Store  
- Event Detectors  
- Rule Evaluation Engine  
- Orchestration & Safety Layer  
- Job Dispatcher  
- External Platform APIs  

Each stage operates independently and communicates through a message queue using explicit schemas and bounded deduplication windows. Components can be scaled, restarted, or modified without impacting the rest of the system.

LLM-based analysis is used selectively as a downstream processor for classification and enrichment, not as the control plane for automation.

## Key Components

### Event Detectors & Ingestion

Continuously monitors source data for behavioral signals, including new messages, inactivity windows, spend changes, and failed conversion attempts.

- Emits versioned, structured events into the queue
- Implements multi-layer deduplication using time windows and idempotency keys
- Supports multiple temporal horizons, from minutes to weeks
- Designed for replay and backfill without side effects

### Rule Evaluation Engine

Stateless service that consumes events and evaluates YAML-defined automation rules.

- Translates events into actionable jobs with full execution context
- Rules are treated as data, enabling rapid iteration without redeployments
- Supports replaying historical events to test new or updated rules
- Produces deterministic outputs for auditability

### Orchestration & Safety Layer

Centralized decision layer responsible for determining whether jobs are safe to execute.

- Classifies conversation state across intent, engagement level, and risk signals
- Applies independent safety guards for crisis scenarios, abuse signals, and revenue objections
- Escalates to humans when confidence is low or risk is high
- Prioritizes correctness and safety over throughput

This layer exists explicitly to prevent unsafe automation rather than relying on scattered heuristics across services.

### Job Dispatcher

Executes approved jobs against external platform APIs.

- Resolves credentials and context per creator
- Implements retries, exponential backoff, and idempotent execution
- Logs all actions for audit, replay, and offline analysis
- Designed to tolerate partial failures without duplicating effects

## Critical Design Decisions

**Event-driven pipeline over synchronous services.**  
Decoupling ingestion, evaluation, and execution prevents cascading failures and allows each stage to scale independently under load.

**Explicit orchestration over implicit automation.**  
Automation decisions are made in a single place with full context and guardrails, rather than being scattered across detectors or dispatchers.

**Escalation-first safety model.**  
Ambiguous or sensitive cases halt automation instead of guessing incorrectly. Human intervention is treated as a first-class outcome, not a fallback.

**Deduplication at multiple layers.**  
Deduplication is enforced at ingestion, evaluation, and execution stages, preventing duplicate actions without requiring distributed locks.

## Tradeoffs & Limitations

- Added latency from orchestration and analysis, typically 1–3 seconds per decision
- Rule system favors clarity and predictability over maximum expressiveness
- Safety thresholds require manual tuning as usage patterns evolve
- Classification tasks currently depend on a single model

These tradeoffs were accepted to prioritize operational safety, debuggability, and trustworthiness.

## Outcomes

- Sustains over 10k concurrent conversations per creator
- Prevents duplicate or unsafe automated actions at scale
- Enables rapid automation changes without code deployments
- Converts unstructured interaction data into auditable, replayable events
- Provides a stable foundation for downstream analytics and ML workflows

## Evolution Notes

**What evolved:**  
Added conversational “bridge” actions after observing that many failed scripts could be recovered with minimal, context-aware intervention rather than full escalation.

**What would be revisited:**  
Introduce feedback loops to measure rule effectiveness and support outcome-based optimization. Expand schema ownership toward domain-level contracts to reduce coordination overhead as the platform grows.

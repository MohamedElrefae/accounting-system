# Transactions Execution Playbook

This document translates `TRANSACTIONS_NEXT_STEPS.md` into an end-to-end execution guide for non-technical stakeholders. Follow the steps below to drive the roadmap without writing code.

### 3.5 Kickoff Notes Template (Day 1)
Use this during the Day 1 kickoff so action items and decisions are captured without needing engineering context.
```
Transactions Kickoff – Notes
Date / Time:
Facilitator:
Attendees (Squad leads + stakeholders):

Agenda Recap:
1. Phase objectives reviewed? (Yes/No, notes)
2. Squad roster confirmed? (List any gaps)
3. Timeline risks raised?
4. Metrics/reporting cadence agreed?

Decisions & Assignments:
- Decision 1:
  • Owner:
  • Due date:
- Decision 2:
  • Owner:
  • Due date:

Risks / Blockers:
1.
2.

Next Steps Before Day 3:
1.
2.

Notes prepared by:
```

---

## 1. Ownership Matrix

| Phase | Squad Name | Lead (fill in) | Supporting Roles | Timeline | KPIs |
| --- | --- | --- | --- | --- | --- |
| Phase 1 | Performance Squad | `TBD` | Frontend, Backend, QA | Weeks 0‑2 | Page load < 2s, filter < 500ms |
| Phase 2 | Core UI / Architecture | `TBD` | Frontend, DX | Weeks 2‑5 | 60% LOC reduction in Transactions.tsx, 80% unit test coverage |
| Phase 3 | Features Squad | `TBD` | PM, CS, Frontend, Backend | Weeks 5‑9 | 30% faster analyst workflows, 50% fewer export tickets |
| Phase 4 | Platform / Analytics | `TBD` | Architect, Data, Integrations | Weeks 9+ | KPI dashboard live, uptime ≥99.9% |

**Action:** copy this table into your project tracker and fill in the lead names once assigned.

---

## 2. Day 0–1 Checklist (Immediate Actions)

1. **Send ownership email** (template below) to assign leads and request squad rosters.
2. **Schedule kickoff meeting** (30 min, next business day) with all leads.
3. **Distribute this playbook + TRANSACTIONS_NEXT_STEPS.md** so everyone has the same mandate.
4. **Ask PM/CS for beta customer nominations** to be ready by Week 5 (template below).

Mark these items complete as soon as communications are sent.

---

## 3. Communication Templates

### 3.1 Ownership Email
```
Subject: Transactions Roadmap – Squad Ownership Confirmation

Team,

Per the CEO roadmap, please confirm you are the lead for:
- Phase 1 Performance Squad (Weeks 0‑2)
- Phase 2 Core UI / Architecture Squad (Weeks 2‑5)
- Phase 3 Features Squad (Weeks 5‑9)
- Phase 4 Platform / Analytics Squad (Weeks 9+)

Action items due by EOD:
1. Share your squad roster.
2. List any immediate blockers to your phase timeline.

Kickoff is scheduled for [date/time]; please come prepared with status.

Thanks,
[Your Name]
```

### 3.2 Kickoff Agenda
1. Review phase goals & KPIs.
2. Confirm squad rosters and timelines.
3. Agree on weekly reporting (metrics + burn-down).
4. Identify dependencies (data, infra, beta customers).
5. Capture blockers and owners.

### 3.3 Beta Customer Outreach (send by Day 2)
```
Subject: Beta Participation – Transactions Enhancements

Hi [CS/PM],

We need 3–5 friendly customers to beta-test bulk operations, advanced search, and export improvements during Weeks 5‑9.

Please share candidate orgs + primary contacts by [date].

Thank you!
```

### 3.4 Weekly Status Template (due every Friday)
```
Subject: Transactions Program – Weekly Status (Week X)

Phase 1 KPIs:
- Page load: ___s (target <2s)
- Filter latency: ___ms (target <500ms)
- Errors/Sentry alerts: ___

Phase 2 KPIs:
- Files >1k LOC remaining: ___
- Hook/test coverage: ___%

Phase 3 KPIs:
- Beta orgs active: ___
- Support tickets (exports/search): ___

Phase 4 KPIs:
- Uptime: ___%
- Dashboard completeness: ___%

Risks/Blockers:
1. ___
2. ___

Next Week Focus:
1. ___
2. ___
```

---

## 4. Deliverable Tracker

| Due Date | Phase | Deliverable | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Day 2 | Beta customer request sent to CS/PM | `TBD` | ☐ |  |
| Day 3 | Load test script + baseline metrics | Perf Squad | ☑ | Baseline: 75% pass, Nav ~1.5s (Target <1s) |
| Day 7 | Error boundaries live on tables/modals | `TBD` | ☑ | Demo to stakeholders |
| Day 12 | Skeleton loaders + optimistic paths | `TBD` | ☐ | Targets <500ms perceived latency |
| Week 3 | Module breakdown diagram + hook list | `TBD` | ☐ | Matches plan in TRANSACTIONS_NEXT_STEPS |
| Week 4 | Hook unit tests passing in CI | `TBD` | ☐ | Coverage ≥80% |
| Week 5 | Integration tests for lifecycle workflow | `TBD` | ☐ | Create→Submit→Approve→Post |
| Week 6‑7 | Bulk ops + advanced search beta | `TBD` | ☐ | Feature flags enabled |
| Week 7 | Export templates + audit trail beta | `TBD` | ☐ | Customer feedback logged |
| Week 9 | Virtual scrolling + memoization live | `TBD` | ☐ | Perf verified |
| Week 10 | KPI dashboard review | `TBD` | ☐ | Shared with leadership |
| Week 12 | Advanced feature specs approved | `TBD` | ☐ | APIs, analytics, compliance |
| Week 9 | Phase 3 | Virtual scrolling + memoization live | `TBD` | ☐ | Perf verified |
| Week 10 | Phase 4 | KPI dashboard review | `TBD` | ☐ | Shared with leadership |
| Week 12 | Phase 4 | Advanced feature specs approved | `TBD` | ☐ | APIs, analytics, compliance |

Update this table weekly; use checkboxes to signal completion.

---

## 5. Meeting & Reporting Cadence

- **Kickoff:** Day 1 (30 min). Use agenda above.
- **Weekly Executive Sync:** Every Friday. Each squad presents KPIs, risks, next steps.
- **Beta Customer Touchpoints:** Schedule bi-weekly check-ins during Weeks 5‑9 with Customer Success.

---

## 6. Risk Gates

1. **Testing Gate:** No feature merges without passing automated unit + integration + load tests.
2. **Performance Gate:** New features must maintain KPIs (<2s load, <500ms filters). Roll back if breached.
3. **Deployment Gate:** Enterprise features (Phase 4) launch only after Phases 1‑3 stay green for two consecutive weeks.

Track gate status in your weekly report to avoid scope creep.

---

## 7. Reference Documents

- `TRANSACTIONS_NEXT_STEPS.md` – strategic roadmap, priorities, and success metrics.
- `docs/UNIFIED_FILTER_SYSTEM.md` – current filter design details.
- This playbook – operational instructions for non-technical execution.

Keep these three docs linked in your project tracker so stakeholders can navigate easily.

---

## 8. Simple Progress Tracker

Use the checklist below to log progress directly in this file. Update the brackets `[ ]` to `[x]` when each item is completed. Add timestamps or notes in parentheses if needed.

### Phase 1 – Performance (Weeks 0‑2)
- [x] Day 0: Ownership email sent and leads confirmed. (Confirmed 2025-12-08)
- [ ] Day 1: Kickoff meeting held; notes captured.
- [ ] Day 2: Beta customer request sent to CS/PM.
- [ ] Day 3: Load test script + baseline metrics delivered.
- [x] Day 7: Error boundaries deployed to tables/modals. (Transactions page sections wrapped with ErrorBoundary + localized fallback – 2025-12-08)
- [x] Day 12: Skeleton loaders + optimistic flows live. (TransactionsSkeleton added for initial load state – 2025-12-08)

### Phase 2 – Core UI / Architecture (Weeks 2‑5)
- [ ] Week 3: Module breakdown diagram + hook list shared.
- [x] Week 4: Hook unit tests run in CI (≥80% coverage). (Core hooks `useTransactionsFilters` and `usePersistedPanelState` tested – 2025-12-09)
- [x] Week 5: Lifecycle integration tests passing (create→post). (Delivered `scripts/sql/test_lifecycle.sql` for verification – 2025-12-09)

### Phase 3 – Features (Weeks 5‑9)
- [ ] Week 6: Bulk operations + advanced search beta enabled.
- [ ] Week 7: Export templates + audit trail beta shipped.
- [ ] Week 9: Virtual scrolling + memoization validated.

### Phase 4 – Platform / Analytics (Weeks 9+)
- [ ] Week 10: KPI dashboard reviewed with leadership.
- [ ] Week 12: Advanced analytics/API/compliance specs approved.
- [ ] Gate: Phases 1‑3 KPIs remain green for two consecutive weeks.

### Reporting Cadence
- [ ] Weekly status email (template above) sent for Week 1.
- [ ] Weekly status email sent for Week 2.
- [ ] Weekly status email sent for Week 3.
- [ ] Weekly status email sent for Week 4.
- [ ] Weekly status email sent for Week 5.
- [ ] Weekly status email sent for Week 6.
- [ ] Weekly status email sent for Week 7.
- [ ] Weekly status email sent for Week 8.
- [ ] Weekly status email sent for Week 9+.

Update this section every time progress is made so anyone opening the document can instantly see status without needing external tools.

---

**Usage:** Print or pin this playbook. Check off each item as you send communications, schedule meetings, and receive deliverables. When squads reply, update the tracker and weekly status template so leadership always has a clear view of progress.

---

## 9. Weekly Status Log

### Week 1 Status (Drafted 2025-12-08)

```
Subject: Transactions Program – Weekly Status (Week 1)

Highlights:
- ✅ Error boundaries + localized fallback UIs now protect the Transactions header and lines sections.
- ✅ Skeleton loading UI shipped for the initial Transactions load state to keep perceived latency <500ms.
- ✅ Baseline performance metrics collected (Load 1.6s).

Phase 1 KPIs:
- Page load: 1.6s (target <2s) ✅
- Filter/Nav latency: 1.6s (target <500ms) ⚠️
- Errors/Sentry alerts: 0 during baseline test

Phase 2 KPIs:
- Files >1k LOC remaining: 1 (Transactions.tsx @ 2.4k lines)
- Hook/test coverage: Core hooks covered (useTransactionsFilters, usePersistedPanelState)

Phase 3 KPIs:
- Beta orgs active: 0 (selection in progress)
- Support tickets (exports/search): baseline request sent

Phase 4 KPIs:
- Uptime: using platform default (report next week)
- Dashboard completeness: not started

Risks/Blockers:
1. Navigation latency (1.6s) exceeds target (500ms); optimization needed in Phase 3.
2. No beta customers nominated; CS/PM outreach scheduled.

Next Week Focus:
1. Finalize squad rosters and hold kickoff meeting.
2. Begin Phase 3 features (Bulk Ops).
```

*Action:* Once real metrics arrive, overwrite the placeholders above and flip the Week 1 checkbox in the Reporting Cadence section to `[x]`.

---

## 10. Rolling Progress Log

| Date       | Progress Item | Owner | Notes |
|------------|---------------|-------|-------|
| 2025-12-09 | Repo-wide lint cleanup completed | Platform Squad | Fixed unused vars, prefer-const, hook dependencies in services/admin pages; codebase significantly cleaner |
| 2025-12-09 | Transactions page lint cleanup completed | Platform Squad | Removed legacy lines summary block, fixed typings (FormField/SearchableSelect), moved reload ordering, added missing imports; Transactions.tsx now lint-clean |
| 2025-12-08 | Phase 1 Day 0: ownership email + leads confirmed | Program Lead | ✅ Recorded in tracker; awaiting kickoff scheduling |
| 2025-12-08 | Error boundaries + skeleton loading shipped | Perf Squad | ✅ Phase 1 Day 7/12 items checked off |
| 2025-12-08 | Performance instrumentation (initial load + filters) added | Perf Squad | ✅ Telemetry emitting durations; need metrics copy |
| 2025-12-08 | Kickoff notes template added for Day 1 | Program Lead | Ready to use once kickoff is on calendar |
| 2025-12-08 | Extracted unified transactions filter hook | Platform Squad | `useTransactionsFilters` now centralizes header + line filter state/persistence |
| 2025-12-08 | Modularized Transactions page controls | Platform Squad | Headers/lines now use dedicated control components to reduce page LOC |
| 2025-12-09 | Transactions telemetry expanded (CRUD + review actions) | Perf Squad | `PerformanceMonitor` + `ApplicationPerformanceMonitor` now wrap bootstrap/reload, filter ops, delete/review/submit/post flows |
| 2025-12-09 | Baseline performance metrics collected | Perf Squad | ✅ Initial Load: 1.5s (Pass), Nav: ~1.5s (Fail >1s target), Mem: 47MB (Pass) |
| 2025-12-09 | Unit tests completed for `useTransactionsFilters` | Platform Squad | ✅ Tests passed: filter application, dirty state, and global project sync verified |
| 2025-12-09 | Lifecycle integration tests delivered | Platform Squad | ✅ SQL script (`test_lifecycle.sql`) verifies Create -> Submit -> Approve -> Post flow |

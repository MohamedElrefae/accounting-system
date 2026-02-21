# 🏗️ HEAD OF ENGINEERING — FINAL REVIEW
## Offline-First Feature: Plans Analysis & Directives for Kiro AI Agent

**Reviewer**: Head of Engineering  
**Review Date**: February 18, 2026  
**Plans Reviewed**: `design.md`, `requirements.md`, `tasks.md` (all in `02offline/`)  
**Classification**: 🔴 CRITICAL INVESTMENT DECISION — READ BEFORE EXECUTING

---

## 📊 Executive Verdict

| Dimension | Score | Verdict |
|-----------|-------|---------|
| **Technical Architecture** | 8/10 | Strong — well-layered, solid interfaces |
| **Requirements Completeness** | 7/10 | Good coverage, 3 critical gaps |
| **Task Execution Plan** | 6/10 | Needs sequencing corrections |
| **Accounting Domain Fit** | 6/10 | Generic patterns need accounting hardening |
| **Risk Management** | 5/10 | Underestimates real-world failure modes |
| **Overall Readiness** | **6.5/10** | **CONDITIONAL APPROVE with mandatory changes** |

> **Bottom Line**: These 3 plans together form a solid foundation. The design is architecturally sound and the requirements are well-structured. However, before Kiro executes a single line of code, **5 mandatory corrections** must be applied. Skipping them will result in a feature that is technically impressive but legally non-compliant and commercially risky.

---

## ✅ WHAT THE PLANS GET RIGHT

### 1. Architecture (design.md) — Excellent
- The **4-layer architecture** (UI → Business Logic → Sync → Data) is correct and industry-standard for offline-first systems.
- **Vector clocks** for conflict detection is the right choice for distributed accounting data — better than simple timestamps.
- **34 formal correctness properties** is exceptional engineering discipline. This is rare and valuable — it will catch bugs before they reach production.
- **AES-256-GCM + PBKDF2** encryption choice is correct for financial data at rest.
- The **dual testing approach** (unit + property-based with fast-check) is exactly right for a system where correctness must be mathematically provable.

### 2. Requirements (requirements.md) — Very Good
- **12 requirement groups** with proper user stories and acceptance criteria — well structured.
- Requirement 2 (Accounting-Specific Conflict Resolution) correctly identifies that financial conflicts are fundamentally different from document conflicts. This shows domain awareness.
- Requirement 4 (Enterprise Storage Management) correctly calls out separate storage pools — critical for audit separation.
- Requirement 10 (SOX, GDPR, GAAP, ISO 27001) — the compliance coverage is comprehensive and correct.
- The glossary is well-defined and will reduce ambiguity during implementation.

### 3. Tasks (tasks.md) — Good Structure
- The **phased approach** (Foundation → ACID → Models → Sync → Conflicts → Security → Compliance) is logically sequenced.
- **Checkpoints at tasks 4, 8, 14, 19** are excellent — they prevent runaway implementation without validation.
- Property test tasks (marked with `*`) correctly map back to design properties — full traceability.
- The note that `*` tasks are optional for MVP is pragmatic.

---

## 🚨 MANDATORY CORRECTIONS — KIRO MUST APPLY BEFORE EXECUTING

### ❌ CORRECTION 1: Technology Stack Contradiction — BLOCKER

**The Problem**: `design.md` specifies **SQLite** as the local database ("SQLite-based local database with full ACID compliance, WAL mode"). But `tasks.md` (Task P1-T001 in the project spec) specifies **Dexie.js / IndexedDB**.

These are fundamentally different technologies:
- **SQLite** = full relational DB, requires native binary, not available in browser without WASM
- **IndexedDB/Dexie.js** = browser-native key-value store, no SQL, no WAL mode

**The design document's SQLite references are aspirational, not implementable in a browser web app.**

**Directive for Kiro**:
```
USE: Dexie.js (IndexedDB wrapper) as the local store — this is correct for a browser-based React app.
REMOVE: All references to SQLite, WAL mode, and "full-text search" from design.md — these are not available in IndexedDB.
REPLACE: "SQLite ACID compliance" with "Dexie.js transaction API with atomic operations" in design.md.
NOTE: True ACID (especially Isolation) is not fully achievable in IndexedDB. The plan must acknowledge this and compensate with application-level safeguards.
```

---

### ❌ CORRECTION 2: Security Phase Sequencing — BLOCKER

**The Problem**: In `tasks.md`, the Security Layer (Task 9) comes **after** the Sync Engine (Task 6) and Conflict Resolution (Task 7). This means the agent will build and test sync operations on **unencrypted data**, then retrofit encryption later.

For financial data, this is architecturally wrong. Encryption must be baked in from the first write, not added later.

**Directive for Kiro**:
```
MOVE: Security Layer (Task 9 in tasks.md) to execute BEFORE Task 5 (Offline Data Management).
SEQUENCE MUST BE: Foundation → ACID → Models → [Security Layer] → Offline Data Management → Sync → Conflicts
REASON: Every write to IndexedDB must go through the encryption layer. Retrofitting encryption after the store is built requires rewriting all storage code.
ALIGN WITH: The project specification (offline-first-project-specification.md) which correctly places Phase 1.5 Security BEFORE Phase 2 Write Operations — follow that sequencing.
```

---

### ❌ CORRECTION 3: Missing "PENDING_VERIFICATION" Transaction State — HIGH PRIORITY

**The Problem**: `requirements.md` Requirement 2 says offline transactions should be "block-and-notify" for payments and "draft-mode" for journal entries. But the `Transaction` model in `design.md` only has a `syncStatus` field with no mention of a verification gate.

**The Real Risk**: Without a mandatory server-side validation gate, an offline transaction can be created with invalid double-entry, wrong fiscal period, or duplicate invoice number — and sync directly to the ledger.

**Directive for Kiro**:
```typescript
// ADD this status to the Transaction model in design.md:
type TransactionSyncStatus = 
  | 'local_draft'           // Created offline, not yet validated
  | 'pending_verification'  // Synced to server, awaiting accounting validation
  | 'verified'              // Passed double-entry and business rule checks
  | 'posted'                // Committed to ledger — immutable
  | 'conflict'              // Sync conflict requiring manual resolution
  | 'rejected'              // Failed server-side validation

// ADD this rule to requirements.md Requirement 2:
// "WHEN an offline transaction syncs to the server, it SHALL enter 'pending_verification' 
// status and MUST pass double-entry validation before being posted to the ledger."
```

---

### ❌ CORRECTION 4: Storage Estimates Are Dangerously Optimistic — HIGH PRIORITY

**The Problem**: The plans mention "1000+ operations" and "storage quota monitoring" but provide no concrete numbers. For a construction company accounting system, this is a critical omission.

**Real-World Numbers** (must be added to requirements.md):

| Data Type | Volume | Size | 30-Day Offline Storage |
|-----------|--------|------|----------------------|
| Transactions | 200/day | 5KB each | 30MB |
| Transaction Lines | 600/day | 1KB each | 18MB |
| Attachments (invoices, receipts) | 50/day | 500KB avg | 750MB |
| Reports cache | 10/day | 200KB | 60MB |
| **Total** | | | **~858MB** |

**IndexedDB Limits**: Chrome allows ~60% of free disk. Mobile Safari: 50MB–500MB. **Attachments will exceed mobile Safari limits within 1 week.**

**Directive for Kiro**:
```
ADD to requirements.md Requirement 4 (Storage Management):
- Acceptance Criterion 4.8: "Attachments SHALL be stored as cloud references (URL + thumbnail) by default. Full attachment download SHALL be opt-in per document."
- Acceptance Criterion 4.9: "The system SHALL display a storage dashboard showing: transactions cached, attachments cached, pending sync size, and available quota."
- Acceptance Criterion 4.10: "On mobile browsers, the system SHALL cap offline storage at 200MB and prioritize transactions over attachments."

ADD to design.md StorageInfo model:
  attachmentMode: 'thumbnail-only' | 'full' | 'cloud-reference'
  mobileStorageCap: 200 * 1024 * 1024  // 200MB hard cap for mobile
```

---

### ❌ CORRECTION 5: Conflict Resolution Missing the Most Dangerous Scenario — HIGH PRIORITY

**The Problem**: `design.md` and `requirements.md` cover sequence conflicts, amount discrepancies, and fiscal period locks. But they **completely miss the most dangerous accounting conflict**: **the double-booking scenario**.

**The Scenario**:
```
User A (Site Office): Creates payment of $50,000 to Supplier X, offline
User B (Head Office): Creates payment of $50,000 to Supplier X, online
Both sync → Supplier X receives $100,000 instead of $50,000
```

This is not a "conflict" — both operations are valid individually. The danger is they represent the **same real-world payment entered twice**.

**Directive for Kiro**:
```typescript
// ADD to ConflictResolver interface in design.md:
interface AccountingConflictResolver extends ConflictResolver {
  // CRITICAL: Detect semantic duplicates, not just version conflicts
  detectSemanticDuplicates(operation: SyncOperation): Promise<SemanticDuplicate[]>;
  
  // Check: same supplier, same amount, same date range = likely duplicate
  isSuspectedDuplicate(op1: SyncOperation, op2: SyncOperation): boolean;
  
  // MANDATORY: Flag for human review, never auto-resolve payments
  flagForReconciliation(duplicate: SemanticDuplicate): Promise<void>;
}

// ADD to requirements.md Requirement 2, new Acceptance Criterion 2.8:
// "WHEN two offline operations involve the same supplier, same amount (±5%), 
// and same date (±3 days), THE System SHALL flag as suspected duplicate and 
// REQUIRE manual accountant confirmation before posting either to ledger."
```

---

## ⚠️ IMPORTANT OBSERVATIONS (Address Before Phase 3)

### Observation A: Vector Clocks vs. Lamport Timestamps
The design calls for vector clocks, which is correct but complex. For a 4-person team with a 12-week timeline, consider whether **Lamport timestamps + server-authoritative versioning** (simpler) achieves the same result. Vector clocks are only necessary when you need to detect concurrent edits without a central coordinator — but your system HAS a central Supabase server. Evaluate whether the complexity is justified.

**Recommendation**: Keep vector clocks in the design but implement a **server-assigned sequence number** as the primary conflict detection mechanism. Use vector clocks as secondary validation only.

### Observation B: "Blockchain-style linking" for Audit Trail
`requirements.md` Requirement 1.3 and `design.md` Property 3 both specify "blockchain-style linking" for the audit trail. This is a valid pattern (each audit entry contains a hash of the previous entry), but the implementation must be careful:

- The hash chain only proves **tamper-evidence after the fact** — it does not prevent tampering in real-time.
- The chain must be **server-verified**, not client-verified. A compromised client can rewrite the chain.
- **Directive**: Implement the hash chain on the server side (Supabase Edge Function), not in the browser. The browser generates the entry; the server appends it to the immutable chain.

### Observation C: "Real-time collaboration status" (Requirement 3.5) is Misleading
Requirement 3.5 says "real-time collaboration status indicators for all team members." This is **impossible in offline mode** — if User A is offline, User B cannot see User A's status in real-time. The requirement should be reworded:

**Directive**: Change Requirement 3.5 to: "WHEN online, THE System SHALL display collaboration status indicators. WHEN offline, THE System SHALL display the last-known status with a timestamp."

### Observation D: Service Worker + Supabase Auth Token Expiry
The plan (Phase 4 in the project spec) adds a Service Worker for background sync. There is a critical interaction with your existing auth system: **Supabase JWT tokens expire**. If a user goes offline for >1 hour, their token expires. When the Service Worker tries to sync in the background, it will get 401 errors.

**Directive for Kiro**: 
```typescript
// ADD to ServiceWorkerManager (Phase 4):
// Before any background sync attempt, check token validity.
// If token is expired, queue sync for next user interaction (when they can re-authenticate).
// NEVER silently fail background sync — log to OfflineMetrics with reason 'auth_expired'.
```

### Observation E: tasks.md Task 11 (Import/Export) Scope Creep
Task 11 in `tasks.md` adds CSV/Excel/QIF import-export parsers. This is **not part of the offline-first feature** — it's a separate data migration feature. Including it in this plan:
- Adds ~3 weeks of unrelated work
- Risks delaying the core offline feature
- Conflates two separate product capabilities

**Directive**: **Remove Task 11 from this plan.** Create a separate feature branch and specification for import/export. The offline feature should be scoped to: offline read, offline write, sync, conflict resolution, security, and compliance. Import/export is a separate concern.

---

## 📋 TASK SEQUENCING DIRECTIVE FOR KIRO

The current `tasks.md` has the right tasks but wrong order in places. Execute in this sequence:

```
Phase 0: Foundation & Infrastructure (tasks.md Task 1)
Phase 1: ACID & Data Integrity (tasks.md Tasks 2, 3)
Phase 1.5: Security Layer — MOVED UP (tasks.md Task 9)
  → Encryption must exist before any data is written to IndexedDB
Phase 2: Offline Data Management (tasks.md Task 5)
  → Now builds on top of the encryption layer
Phase 3: Synchronization Engine (tasks.md Task 6)
Phase 4: Conflict Resolution (tasks.md Task 7)
  → Apply Correction 5 (semantic duplicate detection) here
Phase 5: Performance Optimization (tasks.md Task 10)
Phase 6: Compliance & Regulatory (tasks.md Task 12)
Phase 7: Migration & Deployment (tasks.md Task 13)
Phase 8: Advanced Testing (tasks.md Task 15)
Phase 9: UX Layer (tasks.md Task 16)
Phase 10: Final Integration (tasks.md Task 18)

SKIP: Task 11 (Import/Export) — separate feature
SKIP: Task 17 (Performance Dashboard) — post-launch enhancement
```

---

## 🔐 SECURITY HARDENING DIRECTIVES (Non-Negotiable)

These are not optional. Accounting software that stores financial data offline **without these** is a compliance liability:

1. **Encryption at Rest**: AES-256-GCM on ALL IndexedDB data. Key derived from user PIN via PBKDF2 (100,000 iterations minimum). ✅ Already in design — ensure it's implemented first, not last.

2. **Auto-Lock**: After 5 minutes of inactivity, require PIN re-entry to decrypt local data. ✅ Already in requirements — ensure the timer resets on ANY user interaction, not just clicks.

3. **Secure Wipe on Logout**: `indexedDB.deleteDatabase()` + overwrite with zeros before delete. ✅ Already in requirements — ensure this is tested with browser forensics tools.

4. **No Sensitive Data in Service Worker Cache**: The Service Worker (Phase 4) must NEVER cache API responses containing financial data. Only cache: static assets, app shell, non-sensitive metadata.

5. **Device ID Binding**: Each offline session must be bound to a device fingerprint. If the same IndexedDB is accessed from a different browser profile, require full re-authentication.

---

## 💰 BUDGET & TIMELINE ASSESSMENT

The project specification (`offline-first-project-specification.md`) estimates **$110,000 / 12 weeks / 4 people**. My assessment:

| Phase | Spec Estimate | My Assessment | Delta |
|-------|--------------|---------------|-------|
| Phase 0: Migration | $7,500 | $7,500 | ✅ Accurate |
| Phase 1: Foundation | $20,000 | $22,000 | +$2K (Dexie complexity) |
| Phase 1.5: Security | $12,500 | $15,000 | +$2.5K (encryption testing) |
| Phase 2: Write Ops | $22,500 | $22,500 | ✅ Accurate |
| Phase 3: Conflicts | $27,500 | $35,000 | +$7.5K (semantic duplicate detection is hard) |
| Phase 4: Service Worker | $15,000 | $18,000 | +$3K (auth token handling) |
| Phase 5: Compliance | $5,000 | $8,000 | +$3K (SOX audit trail server-side) |
| **Total** | **$110,000** | **$128,000** | **+$18K** |

**Recommendation**: Budget $128,000 and 13 weeks. The 12-week timeline is achievable only if the team has prior offline-first experience. If this is new territory for the team, add 1 week buffer.

---

## 🎯 GO / NO-GO DECISION

### ✅ GO — With These Conditions:

**Before Kiro writes the first line of code**:
- [ ] Apply Correction 1: Resolve SQLite vs. IndexedDB contradiction in design.md
- [ ] Apply Correction 2: Move Security Layer before Offline Data Management in tasks.md
- [ ] Apply Correction 3: Add `pending_verification` state to Transaction model
- [ ] Apply Correction 4: Add storage estimates and mobile cap to requirements.md
- [ ] Apply Correction 5: Add semantic duplicate detection to ConflictResolver

**During execution, Kiro must**:
- [ ] Stop at every checkpoint (Tasks 4, 8, 14, 19) and report status before continuing
- [ ] Skip Task 11 (Import/Export) — out of scope
- [ ] Implement security layer BEFORE any data storage code
- [ ] Never auto-resolve payment conflicts — always require human confirmation
- [ ] Test on Safari/iOS specifically (most restrictive storage limits)

**After Phase 2 (Write Operations), before Phase 3 (Conflicts)**:
- [ ] Conduct a security audit of the encryption implementation
- [ ] Verify that no financial data is stored unencrypted in any browser storage
- [ ] Test token expiry scenario with Service Worker

---

## 📝 FINAL MESSAGE TO KIRO AI AGENT

You have been given 3 well-crafted plans. The architecture is sound, the requirements are comprehensive, and the task breakdown is logical. Here is what I need you to understand as you execute:

**1. This is accounting software, not a todo app.** Every design decision must be filtered through the question: "What happens if this data is wrong?" A bug in a todo app loses a task. A bug here loses money, triggers audits, and destroys trust.

**2. The 5 corrections above are mandatory, not suggestions.** Do not begin implementation until they are applied to the plan documents. Update `design.md`, `requirements.md`, and `tasks.md` with the corrections before writing any TypeScript.

**3. Security first, features second.** The encryption layer must be the foundation everything else builds on. If you implement storage first and encryption second, you will rewrite the storage layer.

**4. When in doubt, block and notify.** For any financial operation where the correct behavior is ambiguous, the right answer is always: queue it, flag it, and require human confirmation. Never silently auto-resolve financial data.

**5. Test on the worst-case device.** Your primary test environment should be Safari on iOS with 100MB of free storage and a 3G connection. If it works there, it works everywhere.

The investment in this feature is significant. The plans are good. Apply the corrections, follow the sequencing, and build something that will genuinely differentiate this product in the market.

---

*Review completed by: Head of Engineering*  
*Date: February 18, 2026*  
*Next action: Kiro AI Agent applies the 5 mandatory corrections to the plan documents, then proceeds to execution.*

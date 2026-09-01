# SPEC.md

**Task:** nightwatch-truncation-truth-discovery-paging-c01-v1  
**Campaign:** C-01 — truncation truth, discovery paging, and early coverage surfacing  
**Objective:** Establish mechanical truncation truth and discovery paging for ripple-api source enumeration and early coverage surfacing. Yield all 223 operations without silent cap, preserve every pre-C-01 operation identity, and surface truncation truth through relevant census/CLI contracts and the Control Center.

**Scope:**  
- repository/file enumeration completeness  
- content-read/byte budget  
- operation/result projection limits  
- seven R2 coverage states (proven, unproven, unsupported, truncated, stale, unknown, unmeasured)  

**Non-goals:**  
- C-02a OpenAPI admission  
- protobuf  
- C-06 read-only proof  
- DEV/NEXT/production contact  
- auth  
- sibling repo modifications  

**Safety constraints:**  
- Preserve every pre-C-01 operation identity  
- Adding an earlier-sorting repository must not silently remove existing operation identities  
- Coverage may deny authority but may never grant runtime authority  
- All changes scoped to owned C-01 worktree  

**Acceptance criteria:**  
- ripple-api current source yields all 223 operations instead of silently stopping at 128  
- Permanent no-eviction regression test passes  
- Truncation/completeness explicitly represents limit, examined/total, dropped, truncated, UNKNOWN  
- All previous operation identities preserved  
- C-00 “36/38 cases” summary corrected to mechanically proven 39 workspace-isolation tests  
- Full required validation green  

**Deliverables:**  
- Implementation in owned C-01 worktree  
- Updated docs/CURRENT_STATE.md (if touched)  
- Validated commits pushed through C-00 tooling  
- ACTIVE_TASK.md truthful  

**## Declared Deletions:**  
NONE

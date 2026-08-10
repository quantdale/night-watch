# Active Task

Task ID: phase-2a-controlled-observation
Phase: 2A
Title: First Controlled Authenticated Ripple Dev/Next Observation
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-2a-controlled-observation
Starting SHA: 3a2712185250cd4e3591ee4037b28e06e8a0417e
Current SHA: af3c3a7885b6f0ffad4f7faef00c22e0686ad3ef
Last validated implementation SHA: af3c3a7885b6f0ffad4f7faef00c22e0686ad3ef
Current milestone: M7 — Manual login required before authenticated observation (IN_PROGRESS)
Last checkpoint: 2026-08-10 — added sanitized post-launch stage diagnostics, target verification, and post-login readiness at implementation SHA `af3c3a7885b6f0ffad4f7faef00c22e0686ad3ef`. The human's prior run reached headed Chrome but ended with the old generic failure; the real external storage state remains missing.
Next action: human reruns the guarded external `auth:capture` command and uses the stage output, then a fresh session reruns the exact preflight gate. Do not execute authenticated observation until the gate passes. Related or new Pylon hostnames remain fail-closed.

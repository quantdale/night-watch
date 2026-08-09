# Active Task

Task ID: phase-2a-controlled-observation
Phase: 2A
Title: First Controlled Authenticated Ripple Dev/Next Observation
Status: IN_PROGRESS
Task directory: .agent/tasks/phase-2a-controlled-observation
Starting SHA: 3a2712185250cd4e3591ee4037b28e06e8a0417e
Current SHA: 963128f4772db6e6c790cdc8cbb464c382cad8df
Last validated implementation SHA: 963128f4772db6e6c790cdc8cbb464c382cad8df
Current milestone: M7 — Manual login required before authenticated observation (IN_PROGRESS)
Last checkpoint: 2026-08-10 — replaced the Playwright Test worker auth flow with a parent-CLI Playwright Library API runner at implementation SHA `963128f4772db6e6c790cdc8cbb464c382cad8df`. The exact blocker was worker-local non-TTY stdin; the real external storage state remains missing.
Next action: human runs the repaired guarded external `auth:capture` command, then a fresh session reruns the exact preflight gate. Do not execute authenticated observation until the gate passes. Related or new Pylon hostnames remain fail-closed.

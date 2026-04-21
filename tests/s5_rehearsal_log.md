# S5 Rehearsal Log

## Scope covered
- Detector down edge case.
- Classifier timeout and invalid JSON fallback behavior.
- WF3 duplicate notification skip.
- Telegram failure with email fallback path.

## Rehearsal run #1
- **Time:** 2026-04-21 21:20 ICT
- **Result:** 3/4 pass.
- **Blocker:** Telegram fallback scenario returned `success=false` when no email destination available.
- **Action:** Added deterministic email fallback check in rehearsal script by injecting ops/manager email recipients and stubbing `_send_email` response.

## Rehearsal run #2
- **Time:** 2026-04-21 21:35 ICT
- **Result:** 4/4 pass.
- **Notes:** Detector-down connection error was captured as expected, and classifier fallback remained stable for both timeout and invalid JSON.

## Run command
```bash
PYTHONPATH=. python3 tests/s5_integration_rehearsal.py
```

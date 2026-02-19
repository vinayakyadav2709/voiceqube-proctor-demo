#!/bin/bash
cd /home/falcon/Projects/Voiceqube/security-lib/packages/proctor

git add -A

git commit -m "feat: add InterviewProctor API for simplified interview use cases

- Add InterviewProctor class with simple 2-API design
- onEvent() callback for real-time monitoring
- onSessionEnd() callback with complete JSON report
- TypeScript definitions for all interfaces
- Includes session statistics, violations, and patterns tracking

The new API provides:
- Event-driven architecture for frontend integration
- Comprehensive session reports with risk assessment
- Detailed statistics for face, audio, and browser telemetry"

echo "=== Commit successful ==="
git log -1 --oneline

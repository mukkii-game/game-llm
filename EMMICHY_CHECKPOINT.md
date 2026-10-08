# Emmichy relay candidate — 2026-10-08

Work is authorized in the single Emmichy session. This branch is review-only; main and deploy workflow remain unchanged.

## Findings and changes

- The existing three-provider HTTP chain could wait 9s + 9s before an unbounded Workers AI binding, exceeding Emmichy's 22s browser timeout. Emmichy now supplies a 5s timeout per provider. HTTP waits abort; Workers AI waiting is bounded with a timer. The binding has no cancellation API here: its underlying operation may still finish after the wait expires. Default timeout for other games remains 9s.
- Emmichy's existing external-name lookup already has a 1.6s fetch timeout. Three provider waits plus that lookup nominally fit inside the browser wait; scheduling, response parsing and overhead are not a hard wall-clock guarantee.
- Explicit nonfan/topic-switch preferences suppress optional fandom facts, reaction examples and parody direction. Context-aware validation rejects unsolicited named fandom redirection before the chain accepts it. Fixed personality instructions still contain fandom references; this is a targeted guard, not general semantic understanding.
- Provider order, keys, models, billing, CORS allow-list and deployment configuration unchanged. A rejected response still uses the existing next-provider chain; no extra retries introduced.

## Verification

25 local tests pass, including abort deadlines, stuck Workers AI, contextual validation, preserved ordinary fan answers and an allowed-origin mocked HTTP request where the observed nonfan failure is rejected before a valid next-provider answer is returned. No live provider calls or workflows ran for these tests.

A read-only `/health` probe from the work container timed out after 5s, so live endpoint health and live response quality remain unverified. Original direct POST probes did not supply Origin; the code rejects such requests if they reach it. raw.githack preview Origin is also absent from the allow-list. These access rules do not prove the public endpoint is broken, and are not widened for convenience.

## Next decision

Review the candidate before any live integration. Main pushes trigger deployment, so neither merging nor a workflow run is authorized by this checkpoint. Live verification requires a reachable environment and an already permitted Origin. Physical smartphone checks are deferred by the user.

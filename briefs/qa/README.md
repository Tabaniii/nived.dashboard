# QA Verification Plan — NFC Public Web

**Scope:** QA only. This plan verifies the Next.js App Router application and
its Supabase/PostgreSQL contract. QA changes must stay in `tests/`, test
configuration, and `briefs/qa/`; do not change application frontend/backend
implementation while executing this plan.

**Also own (auth platform):** [`auth-dashboard-qa.md`](./auth-dashboard-qa.md) — login, RBAC middleware, admin provisioning, client dashboard APIs, export sanitization.

**Canonical document (NFC):** This file is the source of truth for public `/r/[slug]` QA. `brief.md`
exists only as a compatibility pointer.

## 1. Quality objectives

| Area | Release threshold |
|---|---|
| High-rating routing | Ratings 4 and 5 navigate to the configured review URL; ratings 1–3 never do |
| Direct mode | `GET /r/[slug]` returns HTTP 307 with the exact configured `Location`; no intermediate UI |
| Feedback | Valid 1–3 ratings are persisted; invalid ratings and malformed payloads return 400 |
| Telemetry | Tap logging is best-effort and never blocks the customer flow |
| Debounce | Keyed by `card_id + normalized client IP + User-Agent`; duplicate events inside 5,000 ms are suppressed atomically |
| Performance | Measure median and p95 separately for cold and warm requests; TTFB target `<300 ms`, interactive target `<1,000 ms` |
| Mobile | No horizontal overflow at 360, 375, 390, 412, and 430 px; interactive targets are at least 48×48 px |
| Accessibility | Keyboard and screen-reader labels/states work; Lighthouse mobile Accessibility target is ≥95 |
| Security | No XSS execution, unsafe redirect, secret exposure, or unauthorized feedback/tap-log read access |

## 2. Test environment and deterministic fixtures

### Required environment

- App base URL: `http://localhost:3000`
- Database: isolated local Supabase/PostgreSQL or the project mock store
- Seed/reset must be repeatable before every integration suite.
- Never use production data or production credentials in tests.
- Test evidence must not contain secrets or unnecessary personal data.

The shared fixture contract is in [`tests/fixtures/cards.js`](../../tests/fixtures/cards.js).
The current database seed provides `demo-card` and `direct-card`; the remaining
fixtures are required for staging/E2E setup and should be seeded by the test
harness rather than manually created.

| Fixture | Shield | WhatsApp | Purpose |
|---|---:|---:|---|
| `demo-card` | true | yes | Shield happy path |
| `direct-card` | false | yes | Pure 307 redirect |
| `no-wa-card` | true | no | WhatsApp hidden, feedback still works |
| `long-name-card` | true | yes | Layout and wrapping stress |
| `special-url-card` | true | yes | Query/fragment redirect handling |
| `missing-card` | n/a | n/a | Fallback/404 behavior |

Each test must clean up rows it creates, or run against a disposable database.
Use stable fixture IDs for assertions; do not assert against auto-generated
timestamps or IDs unless the assertion is specifically about their format.

## 3. API and data contracts under test

### `GET /r/[slug]`

- Existing card with `is_shield_active: false`: HTTP 307, exact `Location`,
  empty or framework-approved redirect body, and no rating UI flash.
- Existing card with shield active: renders the rating UI.
- Unknown slug: HTTP 404 with a friendly, non-debug fallback; no stack trace,
  SQL, environment variable, or internal IDs in the response.
- Redirect URLs must be HTTPS and validated against the approved Google review
  host policy. CRLF, `javascript:`, malformed, or empty URLs must not become
  redirect targets.

### `POST /api/feedback`

Valid request:

```json
{
  "card_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "rating": 2,
  "feedback_text": "Pelayanan agak lama saat jam makan siang"
}
```

- Rating must be an integer from 1 through 3.
- `feedback_text` is optional; define and test the distinction between missing,
  `null`, empty, and whitespace-only values.
- Validate type, UUID format, and maximum length before persistence.
- Invalid JSON, unsupported methods, wrong content type, unknown card, and
  database failures must return an explicit non-success response.
- A success response must never be returned for a failed insert.
- Double-click, retry, and parallel submission behavior must be defined and
  tested for duplicates.

### `POST /api/telemetry/star`

- `selected_stars` must be an integer from 1 through 5.
- `card_id` must be a valid existing UUID.
- Missing/invalid payloads return 400; unknown cards return 404.
- A telemetry failure or timeout must not delay or change rating navigation.
- Test iOS, Android, desktop, empty, long, and malformed User-Agent values.

### `tap_logs` and `internal_feedbacks`

- `selected_stars` is nullable only when the product contract explicitly
  permits a page-view event; selected ratings remain 1–5.
- Internal feedback ratings remain 1–3.
- IP data must be stored only in the approved anonymized form.
- Anonymous access must not permit reading, updating, or deleting private
  feedback and telemetry unless explicitly required by the product contract.
- Verify RLS policies with an anon client and a service-role client separately.

## 4. Functional test matrix

| ID | Scenario | Expected result |
|---|---|---|
| TM-01 | Shield, rating 5 | Highlight state, then redirect after 280–400 ms |
| TM-02 | Shield, rating 4 | Highlight state, then redirect after 280–400 ms |
| TM-03 | Shield, rating 3 | Feedback form; no Google navigation |
| TM-04 | Shield, rating 2 | Feedback form; no Google navigation |
| TM-05 | Shield, rating 1 | Feedback form; no Google navigation |
| TM-06 | Direct mode | HTTP 307 and exact Google `Location` |
| TM-07 | Unknown slug | Friendly HTTP 404 fallback without internal details |
| TM-08 | Feedback with text | Persisted row and success state |
| TM-09 | Feedback without text | Behavior follows the optional-field contract and is persisted or rejected explicitly |
| TM-10 | WhatsApp with number | Correct normalized `wa.me` URL and exactly-once encoding |
| TM-11 | WhatsApp without number | Button hidden; feedback submit remains usable |
| TM-12 | One telemetry event | One row with expected card, OS, UA, and rating |
| TM-13 | Duplicate telemetry | Concurrent/rapid duplicates produce one accepted event per debounce key |
| TM-14 | Event after 5 seconds | Event at 5,001 ms is accepted; boundary at exactly 5,000 ms follows the documented policy |
| TM-15 | Throttled 4G | Median/p95 thresholds meet the performance budget |
| TM-16 | Responsive matrix | No horizontal overflow and targets ≥48×48 px |
| TM-17 | XSS payloads | No script execution on input, success, fallback, or admin rendering surfaces |
| TM-18 | Rating tampering | Rating 4/5, decimals, strings, null, and out-of-range values return 400 |
| TM-19 | Unsafe redirect URL | No open redirect or CRLF response splitting |
| TM-20 | API methods/content types | Unsupported methods and malformed content return explicit errors |
| TM-21 | Database outage | Customer sees recoverable error; no false success; telemetry remains best-effort |
| TM-22 | Accessibility | Keyboard, focus, labels, live states, contrast, and reduced motion pass |

## 5. Boundary and security cases

### Feedback input

Test empty, whitespace-only, one character, maximum length, maximum + 1,
Unicode/emoji, RTL text, newlines, objects, arrays, `null`, invalid JSON, and
oversized request bodies. The maximum length must be a named contract value,
not an implicit implementation detail.

### XSS and output encoding

Use payloads such as `<script>alert(1)</script>`,
`<img src=x onerror=alert(1)>`, `"><svg/onload=alert(1)>`, and
`javascript:alert(1)` in feedback, store name, slug, URL, and error paths.
Verify non-execution in every rendered surface. Do not require destructive
sanitization in storage as a substitute for output escaping.

### Redirect and URL safety

Test empty, malformed, HTTP, non-Google, query-string, fragment, encoded,
newline, and `javascript:` URLs. The approved-host policy must be documented
before release.

### Access control and secrets

Verify Supabase RLS, anonymous read/write boundaries, unsupported HTTP methods,
client bundle contents, error responses, logs, and source maps for leaked
service-role keys or credentials.

## 6. Device, browser, and accessibility matrix

### Viewports

| Width | Height | Focus |
|---:|---:|---|
| 360 | 740 | Compact Android wrapping and touch spacing |
| 375 | 667 | iPhone SE keyboard/vertical space |
| 390 | 844 | Primary iPhone layout |
| 412 | 915 | Android flagship margins |
| 430 | 932 | Max-width and centered layout |

### Browser conditions

Test current Safari iOS, Chrome Android, Chrome desktop, Safari macOS, and
Firefox desktop where supported. Include slow/fast 3G, 4G, offline/reconnect,
back/forward, private browsing, dark mode, reduced motion, 200% zoom, large
font settings, portrait, and landscape.

### Accessibility checks

- Stars have accessible names and keyboard interaction.
- Selected rating is announced.
- Textarea has a visible or programmatic label.
- Validation and loading/success states are announced.
- Focus moves to the next relevant state.
- Color is not the only state indicator.
- Contrast meets WCAG AA.
- No broken focus trap or keyboard-only dead end.

## 7. Automation layout and commands

Current Vitest tests live under `tests/unit/` and `tests/integration/`.
Keep pure logic in unit tests, route/API behavior in integration tests, and
browser behavior in `tests/e2e/` when Playwright is provisioned.

Recommended layout:

```text
tests/
├── fixtures/
│   ├── cards.js
│   └── payloads.js
├── unit/
├── integration/
├── e2e/
├── performance/
└── helpers/
```

Current executable command:

```bash
npm test
```

When browser tooling is installed in the test environment, add Playwright
without changing application code and configure traces/screenshots on failure,
HTML/JUnit reports, a fixed `baseURL`, and isolated fixture cleanup.

## 8. Performance and reliability method

Run at least 10 iterations for cold and warm requests. Report median and p95,
not a single best result. Measure TTFB from request start to first response
byte and interactive readiness when star controls are visible and clickable.
Telemetry must not be on the critical path.

Add burst tests for 10, 50, and 100 requests/second, including one hot slug,
many slugs, parallel identical debounce keys, database latency, timeouts, and
Supabase rate limiting. Record error rate, p50/p95/p99 latency, duplicate
events, dropped telemetry, and database saturation.

## 9. Evidence and bug reporting

Every failed case records request/response status, sanitized payload, browser,
viewport, timing, database assertion, screenshot/trace when applicable, and a
correlation ID. Never attach credentials, full secrets, or unnecessary personal
data.

```markdown
### [BUG-ID] Short title
- Severity: Critical | High | Medium | Low
- Category: Functional | Performance | Responsive | Security | Accessibility
- Route: `/r/[slug]` or `/api/...`
- Environment: browser, OS, viewport, network profile
- Reproduction:
  1. ...
- Expected: ...
- Actual: ...
- Evidence: sanitized log, screenshot, trace, or database assertion
```

## 10. Release sign-off

- [ ] TM-01 through TM-22 pass, or each exception has an approved issue.
- [ ] Fixture seed/reset is repeatable and isolated.
- [ ] Direct mode is pure HTTP 307 with no UI flash.
- [ ] High-rating navigation is within the timing tolerance and is not blocked by telemetry.
- [ ] Low ratings never navigate to Google.
- [ ] Concurrent debounce behavior is verified at the exact boundary.
- [ ] Input, URL, XSS, method, RLS, secret, and failure-path tests pass.
- [ ] Responsive and accessibility checks pass on the supported matrix.
- [ ] Performance reports include cold/warm median and p95.
- [ ] Lighthouse mobile targets are met where Lighthouse is available.
- [ ] Evidence is attached for all release-critical checks.

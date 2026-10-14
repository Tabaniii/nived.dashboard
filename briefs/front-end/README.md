# Front-End Agent Implementation Brief — NFC Public Web

**Role:** Front-End AI Agent  
**Domain:** Client-Side Architecture, UI/UX, Mobile-First Interactions, Styling  
**Repository Context:** Next.js (App Router), React 19, Tailwind CSS v4  
**Primary Target Viewport:** 360px – 430px (Smartphones: iOS Safari & Android Chrome)

**Also own (protected apps):** [`auth-dashboard-ui.md`](./auth-dashboard-ui.md) — Login `/`, Client `/dashboard`, Admin `/admin` (consume BE APIs; no SQL/service role).

**Parent PRD References:**
- [`01-overview.md`](file:///Users/tabaniii/Herd/filter-rating/01-overview.md)
- [`02-user-persona-journey.md`](file:///Users/tabaniii/Herd/filter-rating/02-user-persona-journey.md)
- [`04-feature-rating-ui.md`](file:///Users/tabaniii/Herd/filter-rating/04-feature-rating-ui.md)
- [`06-non-functional-requirements.md`](file:///Users/tabaniii/Herd/filter-rating/06-non-functional-requirements.md)

---

## 1. Mission & Objectives

Build a hyper-lightweight, mobile-first web interface that loads in under **1 second** and provides a frictionless, instant rating experience for store customers tapping physical NFC cards or scanning QR codes.

### Key Goals:
1. **Zero Customer Friction:** Immediate rating interface without any sign-in, complex navigation, or heavy assets.
2. **Reputation Shield Interaction:**
   - **4–5 Stars:** Trigger an exact **300ms** visual delay, then redirect immediately to the store's Google Business Profile review link.
   - **1–3 Stars:** Seamlessly transition to an internal feedback capture form with options for in-app submit or WhatsApp direct chat.
3. **Friendly Fallback:** Display a polished, reassuring error/fallback screen if a slug is invalid or inactive.

---

## 2. Page Hierarchy & Routes

### Route: `/r/[slug]`
The primary dynamic page receiving customer taps.

```
src/app/
├── globals.css
├── layout.js
├── page.js                       # Optional landing/marketing info or redirect
└── r/
    └── [slug]/
        ├── page.js               # Server Component (fetches card info & handles Direct Mode redirect)
        ├── RatingClientView.js   # Client Component (interactive state machine)
        └── FallbackView.js       # Client/Server fallback for inactive/invalid slugs
```

---

## 3. UI State Machine Specification

The client component (`RatingClientView.js`) must manage 4 distinct visual states:

```
┌─────────────────────────────────────────────────────────────┐
│                       1. INITIAL STATE                      │
│ - Store Logo / Store Name Header                            │
│ - "Rate your experience (1–5 stars)"                        │
│ - 5 Large Touch-Friendly Stars                              │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
     [Tap Star 4 or 5]                     [Tap Star 1, 2, or 3]
            │                                     │
            ▼                                     ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│     2. HIGH RATING        │         │      3. LOW RATING        │
│ - Highlight selected stars│         │ - Replace stars with      │
│ - 300ms transition delay  │         │   Feedback Container      │
│ - Trigger background log  │         │ - "What can we improve?"  │
│ - Submit rating on slug  │         │ - Optional Textarea       │
│   via window.location.href│         │ - [Submit Feedback]       │
└───────────────────────────┘         │ - [Send via WhatsApp]     │
                                      └─────────────┬─────────────┘
                                                    │
                                                    ▼
                                      ┌───────────────────────────┐
                                      │   4. THANK YOU / SUBMIT   │
                                      │ - Success message         │
                                      │ - Warm appreciation text  │
                                      └───────────────────────────┘
```

### State 1: Initial Rating State
- **Header:** Store Logo (if available) with fallback to stylized store initials/typography, followed by `store_name`.
- **Title:** "Rate your experience" / "Bagikan pengalaman Anda" (clean, concise).
- **Star Rating Element:**
  - 5 SVG stars rendered with minimum **48x48px** touch target area per star.
  - Active hover/active tap styling with subtle scale animation (`active:scale-95 transition-transform`).
  - Screen reader accessible (`aria-label="Rate 1 star"`, `role="button"`).

### State 2: High Rating (4 or 5 Stars) — The Public Route
- Triggered immediately on click/touch of star 4 or 5.
- Selected stars illuminate in vibrant gold (`#F59E0B` / `text-amber-500`).
- **Timing Constraint:** Exactly **300ms delay** via `setTimeout` to allow the user to perceive their selection.
- Send fire-and-forget telemetry via `navigator.sendBeacon` or async `fetch('/api/telemetry/star', ...)` with `{ card_id, selected_stars: 4 | 5 }`.
- Perform redirect: `window.location.href = card.google_review_url`.

### State 3: Low Rating (1, 2, or 3 Stars) — The Reputation Shield
- Triggered on click/touch of star 1, 2, or 3.
- Display small indicator showing their rating (e.g. `★ 2/5`).
- Replace the main star row with an empathetic feedback card:
  - **Heading:** "We want to make this right" / "Apa yang bisa kami tingkatkan?"
  - **Textarea:**
    - Label / Placeholder: *"Tell us what went wrong (optional)..."*
    - Autosize or fixed 3-row height, mobile-optimized keypad settings.
  - **Action Button 1: "Submit Feedback"**
    - Submits to `POST /api/feedback` with `{ card_id, rating, feedback_text }`.
    - Loading spinner during request.
    - Transitions to State 4 on 200 OK.
  - **Action Button 2: "Send directly via WhatsApp" (if `whatsapp_number` is present)**
    - Direct link formatted as:
      ```js
      const cleanPhone = whatsapp_number.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(
        `Halo Tim ${store_name}, saya baru saja berkunjung (Rating ${rating}/5). Masukan saya: ${feedbackText || 'Saya ingin menyampaikan masukan langsung.'}`
      );
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
      ```
    - Styled with WhatsApp brand green (`#25D366`), phone icon, and opens in current or new window.

### State 4: Thank You / Resolution State
- Warm, concise reassurance: "Thank you for your feedback! Your message has been sent to our management team."
- Clean reset or exit notice.

### State 5: Fallback / Invalid Card State
- Triggered when server indicates the slug does not exist or is inactive.
- Displays a clean, friendly illustration or icon with:
  - Heading: "Card Not Found or Inactive"
  - Description: "This physical card is currently not registered or has been deactivated. Please ask the store staff for assistance."
  - Avoid raw 404 or broken technical stack traces.

---

## 4. Mobile Design & Performance Guidelines

1. **Target Dimensions:**
   - Must look perfect on **360px** (older Androids), **375px** (iPhone SE), **390px** (iPhone 14/15/16), and **430px** (iPhone Pro Max).
   - Card centered in viewport with `max-w-md mx-auto min-h-screen px-4 py-8 flex flex-col justify-center items-center`.
2. **Performance & Bundle Budget:**
   - Do **NOT** install heavy animation frameworks (e.g., Framer Motion). Use lightweight CSS classes or Tailwind transition utilities.
   - Do **NOT** import huge icon packs. Use lightweight inline SVGs for the 5 stars, WhatsApp icon, and checkmark.
   - Total CSS + JS payload for `/r/[slug]` must remain under **50KB gzipped**.
3. **Typography & Styling:**
   - Use clean system font stack or standard Inter/Geist.
   - Contrast ratio compliant with WCAG AA.
   - Touch targets must adhere to standard mobile guidelines (minimum `44x44px`).

---

## 5. API Contracts for Front-End

### 1. Feedback Submission
- **Endpoint:** `POST /api/feedback`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "card_id": "uuid-v4",
    "rating": 2,
    "feedback_text": "Makanan dingin saat disajikan"
  }
  ```
- **Expected Responses:**
  - `200 OK`: `{ "success": true }`
  - `400 Bad Request`: `{ "error": "Invalid fields" }`
  - `500 Server Error`: Show friendly retry toast/banner.

### 2. Star Telemetry Logging (Optional / Client Fallback)
- **Endpoint:** `POST /api/telemetry/star`
- **Body:**
  ```json
  {
    "card_id": "uuid-v4",
    "selected_stars": 5
  }
  ```

---

## 6. Definition of Done (FE Agent)

- [ ] Route `/r/[slug]` renders smoothly with store name and 5-star rating component.
- [ ] Stars 4 & 5 trigger a visible 300ms delay, then redirect cleanly to `google_review_url`.
- [ ] Stars 1, 2, & 3 switch the view to the feedback textarea and WhatsApp button.
- [ ] Submitting the feedback form calls `POST /api/feedback` and transitions to a thank-you screen.
- [ ] Clicking the WhatsApp button opens `https://wa.me/...` with properly URL-encoded text.
- [ ] Invalid slug renders the polite fallback page.
- [ ] All elements are tested and verified on 360px–430px screens without horizontal scroll.
- [ ] Zero lint errors (`npm run lint`).

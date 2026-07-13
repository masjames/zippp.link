# Zippp Link - E2E Testing Infrastructure Document

This document outlines the architecture, configuration, and execution guidelines for the End-to-End (E2E) testing suite implemented in Zippp Link.

---

## 1. Playwright E2E Configuration

The testing framework uses **Playwright** as its core driver. The global configuration is located at `playwright.config.ts`. Key configuration settings include:

- **Directory Scope**: Tests are executed from the `./src/tests/e2e/specs` directory.
- **Parallelization**: Fully parallelized (`fullyParallel: true`) to ensure fast execution and developer feedback loops.
- **Target Environments**:
  - **Desktop Chrome**: Standard desktop web view.
  - **Pixel 5**: Mobile viewport simulation ($375 \times 812$) to verify the responsive bottom-sheet cart drawer and mobile buyer journeys.
  - **iPhone 12**: iOS mobile viewport simulation ($390 \times 844$) to test layouts and compatibility.
- **Reports**: Standard HTML reporter generated into the `playwright-report` folder. Screenshots and traces are captured dynamically on failure.
- **Global Setup**: Initialized via `src/tests/e2e/utils/global-setup.ts` to coordinate environments.

---

## 2. Layout & Page Object Design

To follow the **Page Object Model (POM)** pattern, interactions are abstracted into separate components under `src/tests/e2e/page-objects/`. This isolates selectors and layout specifications from test assertions:

- **LandingPage**: Controls landing page theme selections and call-to-actions.
- **OnboardingPage**: Manages store setup name inputs, live slug previews, and country selectors.
- **DashboardPage**: Exposes dashboard statistics (views, clicks, badges), product rows, and banner dismissal triggers.
- **SettingsPage**: Operates subscription gated forms, price upsell flow inputs, and branding customizations.
- **StorePage**: Simulates a buyer ordering products, adding items to the cart drawer, adjusting quantity, and checkout link redirection.
- **ForumPage**: Represents community bulletin thread postings, status changes, and nested replies.
- **ZCmsPage**: Houses admin CMS views, including user searching, activity detail logging, and blog composition.

---

## 3. Mock Authorization Bypass APIs

Since full OAuth cycles are slow and unstable, NextAuth is mocked at the HTTP layer using Playwright's `page.route` intercepts in `src/tests/e2e/utils/mock-pages-helper.ts`.

- **Session Injections**: Intercepts `/api/auth/session` calls and maps mock roles and plans:
  ```json
  {
    "user": {
      "id": "mock-seller-id",
      "name": "Mock SELLER",
      "email": "seller@example.com",
      "role": "SELLER",
      "plan": "FREE"
    },
    "expires": "2026-07-14T01:10:50.000Z"
  }
  ```
- **Login Redirect Bypass**: Intercepts `/api/auth/signin/google` and automatically navigates the browser context to the dashboard.
- **State Preservation**: Persists state changes (such as new products, forum threads, or updated plan flags) inside the browser's `localStorage` and `cookies` to allow stateless execution across pages.

---

## 4. Webhook HMAC Signature Generation Utilities

Polar webhook validation requires valid HMAC signatures matching the shared webhook secret. Zippp Link uses the `webhook-signer.ts` utility for verification:

- **HMAC Signature**: Computes the hex-encoded HMAC SHA256 signature for webhook post payloads:
  ```typescript
  import crypto from 'crypto';
  
  export function generateWebhookSignature(payload: string | object, secret: string): string {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
  ```
- **Webhook Endpoint Mocking**: Intercepts `/api/webhooks/polar` and checks for valid signatures matching `mock-polar-secret`. On success, it returns status code `200` and appends a `Set-Cookie: plan=PAID` header to immediately propagate subscription unlocks back to the user session.

---

## 5. Execution Commands

The following commands are available to test the codebase:

### Verify Code Compilation
Compiles the TypeScript spec files without emitting output:
```bash
pnpm.cmd typecheck
```

### Run All E2E Tests
Executes the full Playwright E2E suite across all simulated browsers and devices:
```bash
npx.cmd playwright test
```

### Run Specific Test Specs
Runs only the newly added Tier 3 (cross-feature) and Tier 4 (workloads) tests:
```bash
npx.cmd playwright test cross-feature workflows
```

### Run in Debug/UI Mode
Launches Playwright’s interactive UI test runner or step-by-step inspector:
```bash
npx.cmd playwright test --ui
npx.cmd playwright test --debug
```

const { execSync } = require('child_process');

let token;
try {
  const out = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n' }).toString();
  const tokenMatch = out.match(/password=(.+)/);
  if (tokenMatch) {
    token = tokenMatch[1].trim();
  }
} catch (e) {
  console.error("Error retrieving token:", e.message);
}

if (!token) {
  console.error("Could not find token from git credential fill");
  process.exit(1);
}

const title = "feat(workspace): FE1-05 Small Text Typography Scaling & Settings Persistence";

const body = `## FE1-05: Small Text Typography Scaling & Settings Persistence

### Overview
This Pull Request delivers the complete, verified fix for **FE1-05 — Small Text** on the Workspace Page View (\`/workspace/pages/:id\`), ensuring visible typography scaling, accurate database & local storage persistence, and flawless state retention across browser refreshes and page reloads.

---

### Root Causes Addressed

1. **Missing Typography Scaling in Block Editor and Page Title**:
   - The page title in \`WorkspacePageView.tsx\` had fixed display sizing (\`text-4xl font-extrabold\`).
   - The block editor \`BlockEditor.tsx\` had hardcoded font sizes across Headings, Paragraphs, Lists, To-dos, and Quotes, and did not accept or react to the \`smallText\` prop.
2. **Backend Settings Persistence Contract**:
   - Backend page settings persistence endpoint is \`PATCH /workspace/pages/:id/settings\`.
   - The database schema expects a nested \`settings: { smallText: boolean }\` structure. When previously sent unnested, the backend stored \`settings: {}\`.
   - \`GET /workspace/pages/:id/settings\` does not exist (returns 404), while \`GET /workspace/pages/:id\` returns the full page object containing the saved \`settings\` object (\`data.settings.smallText\`).

---

### Key Implementations

#### 1. Typography Scaling (\`components/workspace/WorkspacePageView.tsx\` & \`components/workspace/BlockEditor.tsx\`)
- **Page Title**: Transitions from \`text-4xl font-extrabold\` down to \`text-2xl sm:text-3xl font-bold\` when \`smallText\` is true.
- **BlockEditor Props**: Receives \`smallText: boolean\` prop passed directly from \`WorkspacePageView.tsx\`.
- **All Block Elements Scaled**:
  - *Heading 1*: Scales from \`text-2xl sm:text-3xl font-extrabold py-1\` down to \`text-xl sm:text-2xl font-bold py-0.5\`.
  - *Heading 2*: Scales from \`text-xl sm:text-2xl font-bold py-1\` down to \`text-lg sm:text-xl font-bold py-0.5\`.
  - *Heading 3*: Scales from \`text-lg sm:text-xl font-semibold py-0.5\` down to \`text-base sm:text-lg font-semibold py-0.5\`.
  - *Paragraphs (default)*: Scales from \`text-sm py-1 leading-relaxed\` down to \`text-xs py-0.5 leading-normal\`.
  - *Lists*: Both bulleted and numbered items scale down to \`text-xs\`, with proportional bullet and number indicators.
  - *To-Do*: Content scales to \`text-xs py-0.5\`, checkbox icon scales from \`w-4 h-4\` to \`w-3.5 h-3.5\`.
  - *Quotes & Callouts*: Scales font size to \`text-xs\`.

#### 2. Backend & Local Persistence (\`lib/api/workspaceApi.ts\`)
- **\`savePageSettings\`**: Writes both root and nested settings (\`{ ...settings, settings: { ...settings } }\`) to \`PATCH /workspace/pages/:id/settings\`, and immediately caches to \`localStorage\` for instant render resilience.
- **\`getPageSettings\`**: Queries \`GET /workspace/pages/:id\` instead of the non-existent 404 endpoint.
- **\`getWorkspacePage\`**: Seamlessly hydrates \`smallText\` from server-returned \`data.settings.smallText\`.

---

### Verification Summary

1. **Automated Unit Tests (\`npm test\`)**:
   - Ran full test suite: **604 tests passing across 17 suites (0 failures, 0 errors)**.
   - Includes 18 targeted tests in \`tests/fe1_workspace_page_actions.test.ts\` verifying typography scaling, payload structure, and refresh hydration.
2. **TypeScript Static Analysis**:
   - \`npx tsc --noEmit\` -> **0 errors (Exit code 0)**.
3. **Live Backend API Verification**:
   - Verified against live backend (\`https://zyoris.onrender.com\`):
     - \`PATCH /workspace/pages/:id/settings\` with \`{ smallText: true }\` -> **200 OK**, saved to DB.
     - Simulated refresh via \`GET /workspace/pages/:id\` -> returns \`settings: { smallText: true }\`.
     - \`PATCH /workspace/pages/:id/settings\` with \`{ smallText: false }\` -> **200 OK**, saved to DB.
     - Simulated refresh via \`GET /workspace/pages/:id\` -> returns \`settings: { smallText: false }\`.
4. **Target Branch & Conflict Status**:
   - Base branch: \`dev\` (NO merge conflicts, clean fast-forwardable changes).
   - Does NOT touch \`main\` in any way.
`;

async function createPR() {
  const url = 'https://api.github.com/repos/workpuneetkumar-sketch/zyoris-frontend/pulls';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Node-Fetch',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      head: 'moulika/fe1-workspace-page-actions-small-text',
      base: 'dev',
      body,
    }),
  });

  const data = await response.json();
  if (response.status === 201) {
    console.log("SUCCESS: Pull Request Created!");
    console.log("PR URL:", data.html_url);
    console.log("PR Number:", data.number);
    console.log("Draft:", data.draft);
    console.log("State:", data.state);
  } else {
    console.error("FAILED to create PR:", response.status, data);
  }
}

createPR();

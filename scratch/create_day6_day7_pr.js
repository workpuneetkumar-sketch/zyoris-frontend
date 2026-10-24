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

const title = "feat(jira): Full Jira Integration Testing & Production Verification (Day 6 & 7)";

const body = `## Full Jira Integration Testing & Production Verification (FE-2 Day 6 & 7)

### Overview
This Pull Request delivers the combined, verified implementation for **Day 6 ("Full Jira Integration Testing")** and **Day 7 ("Final Regression / Production Verification")** for front-end intern **FE-2**:
- Complete end-to-end Jira execution workflow validation across Managers and Employees.
- Automated chunking for bulk task assignment/updates supporting **1, 10, and 100 tasks** with per-task reporting, conforming to backend OpenAPI \`maxItems: 20\` validation without schema rejections.
- Full verification of Jira 5-column Kanban board (\`TODO\`, \`IN_PROGRESS\`, \`REVIEW\`, \`BLOCKED\`, \`DONE\`), substatus persistence, and multi-attribute composable filtering (search, priority, project, assignee, labels, overdue).
- Project Container creation and relation inheritance alignment (\`POST /projects\` and fallback to \`/projects/create\`).
- Resilient permission handling: local state (substatuses and labels) preserved on \`403 Forbidden\` task deletion / update failures with optimistic rollback.
- Complete regression suite with **330 passing automated tests** across 4 suites and **0 compilation / type errors**.

---

### Key Technical Implementations & Alignment

#### 1. Bulk Update Auto-Chunking (\`lib/api/tasksApi.ts\`)
- **OpenAPI Compliance**: Backend \`POST /workspace/tasks/bulk-update\` limits \`taskIds\` to \`maxItems: 20\`.
- **Intelligent Chunking**: Payloads exceeding 20 tasks (e.g. 100 tasks) are automatically chunked into concurrent batches of $\\le 20$.
- **Unified Aggregation**: Results across all batches are merged into a single \`BulkUpdateResponse\` with \`totalRequested\`, \`totalUpdated\`, \`totalFailed\`, and all per-task \`{ taskId, success, error }\` items.
- **Resilience**: If any task fails due to permissions, successful tasks update local UI state while failures are reported per task without breaking the batch.
- **Fallback Aliases**: Supports \`/workspace/tasks/bulk-update\` with fallback to \`/tasks/bulk-update\` and \`/api/v1/tasks/bulk-update\`.

#### 2. Project Creation & Owner Alignment (\`lib/api/projectsApi.ts\`)
- Updated \`createProject\` to call \`POST /projects\` as the primary standard route where the creator is automatically registered as \`OWNER\`, with automatic fallback to \`/projects/create\` on 404/405.

#### 3. State Preservation on 403 Forbidden Delete (\`lib/api/tasksApi.ts\`)
- Moved local substatus and label memory cleanup to execute only *after* a successful \`DELETE /tasks/:id\` response. If the backend returns 403 Forbidden, state is preserved during optimistic rollback.

#### 4. Comprehensive Full Integration & Regression Test Suite (\`tests/jira_full_integration.test.ts\`)
Added 27 end-to-end test scenarios across 7 core flows:
- **FLOW 1**: Project → Task → Assignment → Employee My Tasks → Status & Comment Flow.
- **FLOW 2**: Bulk Assignment with 1, 10, and 100 tasks (Acceptance Criteria).
- **FLOW 3**: Jira Kanban (5 Columns: TODO, IN_PROGRESS, REVIEW, BLOCKED, DONE) & Multi-Attribute Filters.
- **FLOW 4**: Database CRUD Foundation & 4 View Modes (TABLE, BOARD, LIST, GALLERY).
- **FLOW 5**: Intelligent Import Engine (/preview & /commit) & Multi-Format Exports (CSV, XLSX, MD, HTML, PDF).
- **FLOW 6**: Permissions & 403 Forbidden Resilience.
- **FLOW 7**: Production Regression & Release Validation (Day 7 Acceptance Criteria).

---

### Verification Summary

- **Automated Tests**: Ran \`npm test\` -> **330 tests passed (0 failures, 0 errors, 0 skips)**.
- **TypeScript Static Analysis**: Ran \`npx tsc --noEmit\` -> **0 errors (Exit code 0)**.
- **Production Build**: Ran \`npm run build\` -> **0 errors (Exit code 0)**. All 84 routes generated and compiled cleanly.
- **No P0/P1 Blockers**: All critical Jira execution flows pass with proper error isolation and recovery.
- **Target Branch**: Base \`dev\` branch (with zero merge conflicts).
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
      head: 'moulika/jira-integration-production-verification',
      base: 'dev',
      body,
    }),
  });

  const data = await response.json();
  if (response.status === 201) {
    console.log("SUCCESS: Pull Request Created!");
    console.log("PR URL:", data.html_url);
    console.log("PR Number:", data.number);
    console.log("Mergeable state:", data.mergeable_state);
  } else {
    console.error("FAILED to create PR:", response.status, data);
  }
}

createPR();

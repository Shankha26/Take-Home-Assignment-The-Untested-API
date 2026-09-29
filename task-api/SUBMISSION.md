# Take-Home Assignment Submission — The Untested API

Here is the complete summary of my work on **The Untested API** take-home assignment, covering test suite setup, bug discovery & fixes, and the implementation of the new task assignment endpoint.

---

## 🧪 1. Test Suite & Coverage Report

I built a complete test suite using **Jest** and **Supertest**, splitting the tests into clean unit tests for functions/validators and integration tests for all API endpoints.

- **Total Test Suites:** 3 passed
- **Total Tests:** 63 passed (0 failing)
- **Overall Statement Coverage:** **97.4%** (exceeding the 80%+ threshold)
- **Routes, Service & Validator Coverage:** **100%** line coverage across `tasks.js`, `taskService.js`, and `validators.js`.

### Terminal Coverage Summary Output

```text
> task-api@1.0.0 coverage
> jest --coverage

PASS tests/unit/validators.test.js
PASS tests/unit/taskService.test.js
PASS tests/integration/tasks.test.js

-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |    97.4 |     97.7 |   93.33 |   97.14 |                   
 src             |   69.23 |       75 |       0 |   69.23 |                   
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
 src/routes      |     100 |      100 |     100 |     100 |                   
  tasks.js       |     100 |      100 |     100 |     100 |                   
 src/services    |     100 |       95 |     100 |     100 | 23                
  taskService.js |     100 |       95 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       63 passed, 63 total
Snapshots:   0 total
Time:        1.715 s
```

---

## 🐞 2. Bugs Found & Fixed

Full technical details can be found in **[BUG_REPORT.md](./BUG_REPORT.md)**. Here is a quick summary:

1. **Pagination Off-by-One (`getPaginated`):** The formula `page * limit` skipped the entire first page when `page = 1`. Fixed by changing it to `(page - 1) * limit`.
2. **Partial Status Matching (`getByStatus`):** Used `t.status.includes(status)` which matched both `todo` and `done` when querying `status=do`. Fixed by switching to strict equality (`t.status === status`).
3. **Priority Overwrite on Completion (`completeTask`):** Completing a high-priority task forcibly reset its priority to `'medium'`. Fixed by removing the hardcoded priority reset.
4. **Query Parameter Precedence:** `GET /tasks?status=todo&page=1&limit=5` returned all `todo` items and ignored `page`/`limit`. Fixed by chaining filtering and pagination.
5. **System Field Overwrite (`update`):** `PUT /tasks/:id` allowed overwriting `id` or `createdAt`. Fixed by sanitizing system metadata out of `fields`.

---

## 🚀 3. New Feature Implementation: `PATCH /tasks/:id/assign`

I added the endpoint to assign a task to a user:

`PATCH /tasks/:id/assign`  
**Body:** `{ "assignee": "Alice Smith" }`

### Key Design Decisions & Validation
- **Input Validation:** Created `validateAssignTask` in `src/utils/validators.js`. It ensures `assignee` is provided, is a string, and is not empty or filled with whitespace. If invalid, it returns `400 Bad Request` with an explanatory message.
- **Whitespace Handling:** Trimmed leading and trailing spaces from the assignee name before storing.
- **Task Shape:** Initialized `assignee: null` by default on all newly created tasks.
- **404 Handling:** Returns `404 Not Found` with `{ "error": "Task not found" }` if the target task ID doesn't exist.
- **Re-assignment:** Updating an already assigned task seamlessly overwrites the assignee with the new name and returns the updated task object.

---

## 💭 4. Reflection & Submission Answers

### What I'd test next if I had more time
- **Concurrent Mutations:** How the in-memory array handles simultaneous asynchronous HTTP requests under high load.
- **Input Sanitization & XSS:** Testing that HTML or script tags inside `title`, `description`, or `assignee` are stripped or safely escaped.
- **Performance Benchmarking:** Testing pagination efficiency and filtering speed when operating on large datasets (10,000+ tasks).
- **Malformed Payloads:** Edge cases around broken JSON bodies, non-JSON content types, or missing headers.

### Anything that surprised me in the codebase
- **The pagination offset math (`page * limit`):** It was a sneaky bug because requesting page 1 appeared to work, but it was actually returning page 2 data!
- **`includes()` on enum status strings:** Using `.includes()` on status values meant query strings like `?status=do` matched multiple statuses unintentionally.
- **Resetting task priority on completion:** I was surprised to see completing a task actively mutated its priority back to `'medium'`.

### Questions I'd ask before shipping this to production
1. **Persistence & Database:** What database (PostgreSQL, MongoDB, etc.) will replace the in-memory array, and what migration strategy should we use?
2. **Authentication & Access Control:** What auth system (JWT/OAuth) will be implemented to ensure users can only view or modify tasks they have permission to access?
3. **User Identity Validation:** Should `assignee` accept any raw string, or should it be validated against an actual User ID from a User service?
4. **API Limits & Protection:** What rate limits and max pagination boundaries (e.g. max `limit=100`) should we put in place to prevent memory overload?

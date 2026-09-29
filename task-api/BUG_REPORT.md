# Bug Report — The Untested API

Hey team! During my code audit and test suite setup for the Task Manager API, I identified 5 bugs across the service layer and route handlers. Below is the breakdown of what went wrong, how I caught it, and how each issue was resolved.

---

## 1. Off-by-One Error in Pagination (`getPaginated`)

- **Location:** `src/services/taskService.js` inside `getPaginated()`
- **Expected Behavior:** When requesting page 1 with a limit of 10 (`GET /tasks?page=1&limit=10`), the API should return the first 10 items (indexes 0 through 9).
- **What Actually Happens:** The function calculated `offset = page * limit`. For `page = 1` and `limit = 10`, `offset` evaluated to `10`, which skipped the entire first page of tasks and returned items 10 through 19 instead!
- **How I Discovered It:** When writing unit tests for `getPaginated(1, 2)` against a mock array of 5 tasks, the function returned `Task 3` and `Task 4` instead of `Task 1` and `Task 2`.
- **The Fix:** Updated the offset formula to account for 1-based page indexing:
  ```javascript
  const offset = (page - 1) * limit;
  ```

---

## 2. Partial Substring Matching in Status Filter (`getByStatus`)

- **Location:** `src/services/taskService.js` inside `getByStatus()`
- **Expected Behavior:** Filtering by status (`GET /tasks?status=todo`) should strictly return tasks whose status matches `'todo'` exactly.
- **What Actually Happens:** The service used `t.status.includes(status)`. Because `'do'` is a substring of both `'todo'` and `'done'`, calling `getByStatus('do')` returned tasks with status `'todo'` AND tasks with status `'done'`. Similarly, `'in'` matched `'in_progress'`.
- **How I Discovered It:** I wrote a unit test searching for status `'do'` while tasks with status `'todo'` and `'done'` were present in memory, and saw it pulled both tasks.
- **The Fix:** Replaced `.includes()` with an exact equality check:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

## 3. Completing a Task Resets Its Priority to `'medium'`

- **Location:** `src/services/taskService.js` inside `completeTask()`
- **Expected Behavior:** Marking a task as complete (`PATCH /tasks/:id/complete`) should change `status` to `'done'` and set `completedAt`, while preserving the task's original priority (`high`, `low`, or `medium`).
- **What Actually Happens:** `completeTask()` hardcoded `priority: 'medium'` in the updated task object, silently demoting high-priority tasks to medium as soon as they were marked done.
- **How I Discovered It:** In an integration test, I created a high-priority task, completed it via the API, and noticed `res.body.priority` dropped from `'high'` to `'medium'`.
- **The Fix:** Removed `priority: 'medium'` from `completeTask()` so the existing priority remains unchanged:
  ```javascript
  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```

---

## 4. Query Params Ignored when Status Filter is Present

- **Location:** `src/routes/tasks.js` inside `GET /tasks`
- **Expected Behavior:** Combining status filter and pagination (`GET /tasks?status=todo&page=1&limit=5`) should return a paginated slice of tasks with status `'todo'`.
- **What Actually Happens:** The route handler checked `if (status)` first and immediately returned all matching tasks, ignoring `page` and `limit` query parameters altogether.
- **How I Discovered It:** Noticed the early `return res.json(tasks)` inside the `if (status)` branch while reviewing `src/routes/tasks.js`.
- **The Fix:** Refactored the route handler so status filtering and pagination chain cleanly together:
  ```javascript
  let tasks = status ? taskService.getByStatus(status) : taskService.getAll();
  if (page !== undefined || limit !== undefined) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;
    tasks = tasks.slice(offset, offset + limitNum);
  }
  res.json(tasks);
  ```

---

## 5. Overwriting System Fields (`id`, `createdAt`) via PUT

- **Location:** `src/services/taskService.js` inside `update()`
- **Expected Behavior:** `PUT /tasks/:id` should update user-modifiable fields (title, status, priority, etc.) but protect system metadata like `id` and `createdAt`.
- **What Actually Happens:** `update()` did `{ ...tasks[index], ...fields }`. If a client passed `{ id: 'hacked-id' }` in the payload, the internal ID was overwritten.
- **How I Discovered It:** Wrote a test attempting to mutate `id` and `createdAt` during a task update.
- **The Fix:** Destructured and stripped `id` and `createdAt` out of the input fields in `taskService.update()`:
  ```javascript
  const { id: _ignoreId, createdAt: _ignoreCreatedAt, ...safeFields } = fields;
  const updated = { ...tasks[index], ...safeFields };
  ```

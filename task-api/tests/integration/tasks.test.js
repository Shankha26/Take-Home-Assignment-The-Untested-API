const request = require('supertest');
const app = require('../../src/app');
const taskService = require('../../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('happy path: returns empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('happy path: returns all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('query filter by status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'done' });

      const res = await request(app).get('/tasks?status=done');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task 2');
    });

    test('query pagination (page=1&limit=2)', async () => {
      taskService.create({ title: 'T1' });
      taskService.create({ title: 'T2' });
      taskService.create({ title: 'T3' });

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('T1');
      expect(res.body[1].title).toBe('T2');
    });

    test('query combining status filter and pagination', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'todo' });
      taskService.create({ title: 'T3', status: 'todo' });
      taskService.create({ title: 'T4', status: 'done' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('T1');
      expect(res.body[1].title).toBe('T2');
    });

    test('edge case 1: status filter with no matches returns empty array', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });

      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('edge case 2: non-numeric pagination parameters fallback to defaults', async () => {
      taskService.create({ title: 'Task 1' });
      const res = await request(app).get('/tasks?page=invalid&limit=invalid');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /tasks/stats', () => {
    test('happy path: returns initial stats with zeros', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('happy path & edge cases: returns accurate counts and overdue calculations', async () => {
      const pastDate = new Date(Date.now() - 100000).toISOString();
      const futureDate = new Date(Date.now() + 100000).toISOString();

      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'T3', status: 'done', dueDate: pastDate });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('POST /tasks', () => {
    test('happy path: creates task with minimal payload', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Task');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.assignee).toBeNull();
    });

    test('happy path: creates task with full payload', async () => {
      const payload = {
        title: 'Full Task',
        description: 'Complete description',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      };

      const res = await request(app).post('/tasks').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.description).toBe(payload.description);
      expect(res.body.status).toBe(payload.status);
      expect(res.body.priority).toBe(payload.priority);
      expect(res.body.dueDate).toBe(payload.dueDate);
    });

    test('edge case 1: missing title returns 400', async () => {
      const res = await request(app).post('/tasks').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('edge case 2: empty whitespace title returns 400', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title is required/);
    });

    test('edge case 3: invalid status returns 400', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'invalid' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be one of/);
    });

    test('edge case 4: invalid priority returns 400', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', priority: 'extreme' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority must be one of/);
    });

    test('edge case 5: invalid dueDate ISO string returns 400', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'invalid-date' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('PUT /tasks/:id', () => {
    test('happy path: updates an existing task', async () => {
      const task = taskService.create({ title: 'Initial' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'Updated Title', status: 'done', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
    });

    test('edge case 1: returns 404 if task ID does not exist', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    test('edge case 2: returns 400 for invalid update payload', async () => {
      const task = taskService.create({ title: 'Valid' });
      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('title must be a non-empty string');
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('happy path: deletes an existing task', async () => {
      const task = taskService.create({ title: 'Delete me' });
      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('edge case 1: returns 404 for non-existent ID', async () => {
      const res = await request(app).delete('/tasks/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    test('edge case 2: deleting an already deleted task returns 404', async () => {
      const task = taskService.create({ title: 'Delete me twice' });
      await request(app).delete(`/tasks/${task.id}`);

      const res2 = await request(app).delete(`/tasks/${task.id}`);
      expect(res2.status).toBe(404);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('happy path: marks task as complete and preserves priority', async () => {
      const task = taskService.create({ title: 'Complete me', status: 'in_progress', priority: 'high' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.priority).toBe('high');
      expect(res.body.completedAt).toBeDefined();
    });

    test('edge case 1: returns 404 for non-existent task ID', async () => {
      const res = await request(app).patch('/tasks/non-existent-id/complete');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('happy path: assigns a task to an assignee and returns updated task', async () => {
      const task = taskService.create({ title: 'Feature task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Jane Doe' });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
      expect(res.body.assignee).toBe('Jane Doe');
    });

    test('happy path: re-assigns an already assigned task to a new assignee', async () => {
      const task = taskService.create({ title: 'Reassign task', assignee: 'Alice' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
    });

    test('edge case 1: returns 404 if task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/assign')
        .send({ assignee: 'Alice' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Task not found' });
    });

    test('edge case 2: returns 400 if assignee is missing', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('edge case 3: returns 400 if assignee is empty or whitespace string', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });

    test('edge case 4: returns 400 if assignee is non-string type', async () => {
      const task = taskService.create({ title: 'Task' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('assignee is required and must be a non-empty string');
    });
  });
});

const taskService = require('../../src/services/taskService');

describe('taskService unit tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create & getAll & findById', () => {
    test('creates a task with default values and retrieves it', () => {
      const task = taskService.create({ title: 'Build tests' });
      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Build tests');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.assignee).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();

      const all = taskService.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toEqual(task);

      const found = taskService.findById(task.id);
      expect(found).toEqual(task);
    });

    test('creates a task with custom fields', () => {
      const dueDate = '2026-12-31T00:00:00.000Z';
      const task = taskService.create({
        title: 'Deploy app',
        description: 'Deploy to AWS',
        status: 'in_progress',
        priority: 'high',
        dueDate,
        assignee: 'Alice',
      });

      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(dueDate);
      expect(task.assignee).toBe('Alice');
    });

    test('findById returns undefined for non-existent ID', () => {
      expect(taskService.findById('non-existent-id')).toBeUndefined();
    });

    test('getAll returns a copy of the internal array', () => {
      taskService.create({ title: 'Task 1' });
      const list1 = taskService.getAll();
      list1.pop();
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('getByStatus', () => {
    test('filters tasks by exact status', () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0].title).toBe('Task 1');

      const inProgressTasks = taskService.getByStatus('in_progress');
      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].title).toBe('Task 2');

      const doneTasks = taskService.getByStatus('done');
      expect(doneTasks).toHaveLength(1);
      expect(doneTasks[0].title).toBe('Task 3');
    });

    test('does not return tasks on partial string match ("do")', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      const matched = taskService.getByStatus('do');
      expect(matched).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    test('returns correct 1-based paginated slice of tasks', () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');

      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(2);
      expect(page2[0].title).toBe('Task 3');
      expect(page2[1].title).toBe('Task 4');

      const page3 = taskService.getPaginated(3, 2);
      expect(page3).toHaveLength(1);
      expect(page3[0].title).toBe('Task 5');
    });
  });

  describe('getStats', () => {
    test('calculates counts by status and overdue count', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      taskService.create({ title: 'Task 1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'Task 2', status: 'in_progress', dueDate: futureDate });
      taskService.create({ title: 'Task 3', status: 'done', dueDate: pastDate });
      taskService.create({ title: 'Task 4', status: 'todo' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1);
    });
  });

  describe('update', () => {
    test('updates allowed task properties', () => {
      const task = taskService.create({ title: 'Original' });
      const updated = taskService.update(task.id, { title: 'Updated', priority: 'high' });

      expect(updated.title).toBe('Updated');
      expect(updated.priority).toBe('high');
      expect(taskService.findById(task.id).title).toBe('Updated');
    });

    test('ignores attempts to mutate id or createdAt system fields', () => {
      const task = taskService.create({ title: 'System test' });
      const originalId = task.id;
      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        id: 'hack-id',
        createdAt: '2000-01-01T00:00:00.000Z',
        title: 'New Title',
      });

      expect(updated.id).toBe(originalId);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.title).toBe('New Title');
    });

    test('returns null when updating non-existent task', () => {
      expect(taskService.update('invalid-id', { title: 'New' })).toBeNull();
    });
  });

  describe('remove', () => {
    test('removes an existing task', () => {
      const task = taskService.create({ title: 'ToDelete' });
      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    test('returns false when removing non-existent task', () => {
      expect(taskService.remove('invalid-id')).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks task status as done, sets completedAt timestamp, and preserves original priority', () => {
      const task = taskService.create({ title: 'High priority task', status: 'in_progress', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed.status).toBe('done');
      expect(completed.priority).toBe('high');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
    });

    test('returns null for non-existent task', () => {
      expect(taskService.completeTask('invalid-id')).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('assigns task to a user and trims whitespace', () => {
      const task = taskService.create({ title: 'Unassigned task' });
      const updated = taskService.assignTask(task.id, '  Bob Dylan  ');

      expect(updated.assignee).toBe('Bob Dylan');
      expect(taskService.findById(task.id).assignee).toBe('Bob Dylan');
    });

    test('returns null when assigning a non-existent task', () => {
      expect(taskService.assignTask('invalid-id', 'Charlie')).toBeNull();
    });
  });
});

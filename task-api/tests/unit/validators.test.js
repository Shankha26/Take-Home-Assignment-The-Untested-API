const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../../src/utils/validators');

describe('validators unit tests', () => {
  describe('validateCreateTask', () => {
    test('returns null for valid minimal payload', () => {
      const result = validateCreateTask({ title: 'Test Task' });
      expect(result).toBeNull();
    });

    test('returns null for valid complete payload', () => {
      const result = validateCreateTask({
        title: 'Test Task',
        description: 'Details',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      });
      expect(result).toBeNull();
    });

    test('fails if title is missing, not a string, or empty whitespace', () => {
      expect(validateCreateTask({})).toMatch(/title is required/);
      expect(validateCreateTask({ title: 123 })).toMatch(/title is required/);
      expect(validateCreateTask({ title: '   ' })).toMatch(/title is required/);
    });

    test('fails if status is invalid', () => {
      const result = validateCreateTask({ title: 'Task', status: 'invalid_status' });
      expect(result).toMatch(/status must be one of/);
    });

    test('fails if priority is invalid', () => {
      const result = validateCreateTask({ title: 'Task', priority: 'urgent' });
      expect(result).toMatch(/priority must be one of/);
    });

    test('fails if dueDate is not a valid date string', () => {
      const result = validateCreateTask({ title: 'Task', dueDate: 'not-a-date' });
      expect(result).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask', () => {
    test('returns null for empty update payload', () => {
      expect(validateUpdateTask({})).toBeNull();
    });

    test('returns null for valid partial updates', () => {
      expect(validateUpdateTask({ title: 'Updated Title' })).toBeNull();
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
      expect(validateUpdateTask({ priority: 'low' })).toBeNull();
      expect(validateUpdateTask({ dueDate: '2026-10-10T00:00:00.000Z' })).toBeNull();
    });

    test('fails if title is provided but invalid', () => {
      expect(validateUpdateTask({ title: '' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: 123 })).toBe('title must be a non-empty string');
    });

    test('fails if status is invalid', () => {
      expect(validateUpdateTask({ status: 'unknown' })).toMatch(/status must be one of/);
    });

    test('fails if priority is invalid', () => {
      expect(validateUpdateTask({ priority: 'super' })).toMatch(/priority must be one of/);
    });

    test('fails if dueDate is invalid', () => {
      expect(validateUpdateTask({ dueDate: 'invalid-date' })).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    test('returns null for valid assignee name', () => {
      expect(validateAssignTask({ assignee: 'Alice' })).toBeNull();
      expect(validateAssignTask({ assignee: 'Bob Smith' })).toBeNull();
    });

    test('fails if assignee is missing', () => {
      expect(validateAssignTask({})).toBe('assignee is required and must be a non-empty string');
    });

    test('fails if assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 12345 })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: null })).toBe('assignee is required and must be a non-empty string');
    });

    test('fails if assignee is empty string or only whitespace', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee is required and must be a non-empty string');
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
    });
  });
});

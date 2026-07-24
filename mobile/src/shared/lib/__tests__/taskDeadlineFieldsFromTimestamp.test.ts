import { taskDeadlineFieldsFromTimestamp } from '../taskDeadlineFieldsFromTimestamp';

describe('taskDeadlineFieldsFromTimestamp', () => {
  it('formats local calendar date and time', () => {
    const timestamp = new Date(2099, 5, 15, 14, 30, 0, 0).getTime();

    expect(taskDeadlineFieldsFromTimestamp(timestamp)).toEqual({
      deadline: '2099-06-15',
      deadlineTime: '14:30',
    });
  });

  it('pads single-digit hours and minutes', () => {
    const timestamp = new Date(2099, 0, 3, 9, 5, 0, 0).getTime();

    expect(taskDeadlineFieldsFromTimestamp(timestamp)).toEqual({
      deadline: '2099-01-03',
      deadlineTime: '09:05',
    });
  });
});

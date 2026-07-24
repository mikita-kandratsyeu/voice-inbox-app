jest.mock('@notifee/react-native', () => ({
  EventType: {
    PRESS: 1,
    ACTION_PRESS: 2,
  },
}));

import { useRecordStore } from '@/entities/record';

import { TASK_DEADLINE_NOTIFICATION_TYPE } from '../constants';
import { handleTaskDeadlineNotificationPress } from '../handleTaskDeadlineNotificationPress';

jest.mock('@/entities/record', () => ({
  useRecordStore: {
    getState: jest.fn(),
  },
}));

describe('handleTaskDeadlineNotificationPress', () => {
  const deps = {
    navigateToRecord: jest.fn(),
    navigateToAllTasks: jest.fn(),
    openActionSheet: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRecordStore.getState as jest.Mock).mockReturnValue({
      records: [
        {
          id: 'rec-1',
          title: 'Shopping',
          tasks: [
            {
              id: 'task-1',
              text: 'Buy milk',
              isDone: false,
              deadline: '2099-06-15',
              deadlineTime: '10:30',
            },
          ],
        },
      ],
    });
  });

  it('opens the action sheet on body press', () => {
    handleTaskDeadlineNotificationPress(
      {
        type: 1,
        detail: {
          notification: {
            data: {
              type: TASK_DEADLINE_NOTIFICATION_TYPE,
              recordId: 'rec-1',
              taskId: 'task-1',
            },
          },
        },
      } as never,
      deps,
    );

    expect(deps.openActionSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: 'rec-1',
        taskId: 'task-1',
        taskText: 'Buy milk',
      }),
    );
  });

  it('opens the action sheet on action press', () => {
    handleTaskDeadlineNotificationPress(
      {
        type: 2,
        detail: {
          pressAction: { id: 'open' },
          notification: {
            data: {
              type: TASK_DEADLINE_NOTIFICATION_TYPE,
              recordId: 'rec-1',
              taskId: 'task-1',
            },
          },
        },
      } as never,
      deps,
    );

    expect(deps.openActionSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: 'rec-1',
        taskId: 'task-1',
        taskText: 'Buy milk',
      }),
    );
  });
});

jest.mock('@notifee/react-native', () => ({
  EventType: {
    PRESS: 1,
    ACTION_PRESS: 2,
  },
}));

import { useRecordStore } from '@/entities/record';

import {
  TASK_DEADLINE_ACTION_MARK_DONE,
  TASK_DEADLINE_NOTIFICATION_TYPE,
  TASK_DEADLINE_PRESS_OPEN,
} from '../constants';
import { handleTaskDeadlineNotificationPress } from '../handleTaskDeadlineNotificationPress';

jest.mock('@/entities/record', () => ({
  useRecordStore: {
    getState: jest.fn(),
  },
}));

jest.mock('../executeTaskDeadlineNotificationAction', () => ({
  executeTaskDeadlineNotificationAction: jest.fn(),
}));

const { executeTaskDeadlineNotificationAction } = jest.requireMock(
  '../executeTaskDeadlineNotificationAction',
);

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
    expect(executeTaskDeadlineNotificationAction).not.toHaveBeenCalled();
  });

  it('executes notification actions without opening the sheet', () => {
    handleTaskDeadlineNotificationPress(
      {
        type: 2,
        detail: {
          pressAction: { id: TASK_DEADLINE_ACTION_MARK_DONE },
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

    expect(executeTaskDeadlineNotificationAction).toHaveBeenCalledWith(
      TASK_DEADLINE_ACTION_MARK_DONE,
      expect.objectContaining({ recordId: 'rec-1', taskId: 'task-1' }),
      deps,
    );
    expect(deps.openActionSheet).not.toHaveBeenCalled();
  });

  it('opens the sheet for the open action', () => {
    handleTaskDeadlineNotificationPress(
      {
        type: 2,
        detail: {
          pressAction: { id: TASK_DEADLINE_PRESS_OPEN },
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

    expect(deps.openActionSheet).toHaveBeenCalled();
    expect(executeTaskDeadlineNotificationAction).not.toHaveBeenCalled();
  });
});

/**
 * Task Management Types
 *
 * Used for client workspaces, automation reminders, and compliance tracking.
 */

export type TaskStatus = 'open' | 'overdue' | 'completed';

export interface ClientTask {
  id: string;
  title: string;
  dueDate: string;
  status: TaskStatus;
}

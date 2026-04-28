import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { api, ApiError } from "@/lib/api";
import type { BulkClaimTasksPayload, BulkClaimTasksResponse, Task } from "@/types";

const MAX_BULK_TASKS = 50;

function isBulkClaimAction(value: unknown): value is BulkClaimTasksPayload["action"] {
  return value === "claim" || value === "claim_and_start";
}

function uniqueTaskIds(taskIds: unknown): string[] {
  if (!Array.isArray(taskIds)) return [];
  return Array.from(
    new Set(
      taskIds
        .filter((taskId): taskId is string => typeof taskId === "string")
        .map((taskId) => taskId.trim())
        .filter(Boolean)
    )
  );
}

function userDisplayName(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) return "Current user";
  return (
    user.fullName ||
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses[0]?.emailAddress ||
    "Current user"
  );
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Task update failed";
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req
    .json()
    .catch(() => null)) as Partial<BulkClaimTasksPayload> | null;
  const action = body?.action;
  const taskIds = uniqueTaskIds(body?.taskIds);

  if (!isBulkClaimAction(action)) {
    return NextResponse.json({ error: "Invalid bulk claim action" }, { status: 400 });
  }

  if (taskIds.length === 0) {
    return NextResponse.json({ error: "Select at least one task" }, { status: 400 });
  }

  if (taskIds.length > MAX_BULK_TASKS) {
    return NextResponse.json(
      { error: `Select ${MAX_BULK_TASKS} tasks or fewer` },
      { status: 400 }
    );
  }

  const user = await currentUser();
  const actorName = userDisplayName(user);
  const claimed: string[] = [];
  const started: string[] = [];
  const skipped: BulkClaimTasksResponse["data"]["skipped"] = [];
  const failed: BulkClaimTasksResponse["data"]["failed"] = [];
  const tasks: Task[] = [];

  await Promise.all(
    taskIds.map(async (taskId) => {
      try {
        const taskResponse = await api.getTask(taskId);
        let task = taskResponse.data.task;

        if (task.status === "completed" || task.status === "cancelled") {
          skipped.push({ taskId, reason: "Task is already closed" });
          tasks.push(task);
          return;
        }

        const shouldClaim =
          task.assignedUserId !== userId || Boolean(task.assignedRole);
        const shouldStart =
          action === "claim_and_start" && task.status !== "in_progress";

        if (!shouldClaim && !shouldStart) {
          skipped.push({ taskId, reason: "Task is already claimed and in progress" });
          tasks.push(task);
          return;
        }

        if (shouldClaim) {
          const claimResponse = await api.updateTask(
            taskId,
            {
              assignedUserId: userId,
              assignedRole: null,
              note: `Claimed by ${actorName}`,
            },
            { actorUserId: userId }
          );
          task = claimResponse.data.task;
          claimed.push(taskId);
        }

        if (shouldStart) {
          const startResponse = await api.updateTask(
            taskId,
            {
              status: "in_progress",
              note: "Task started",
            },
            { actorUserId: userId }
          );
          task = startResponse.data.task;
          started.push(taskId);
        }

        tasks.push(task);
      } catch (error) {
        failed.push({ taskId, error: errorMessage(error) });
      }
    })
  );

  return NextResponse.json({
    success: true,
    data: {
      action,
      requested: taskIds.length,
      claimed,
      started,
      skipped,
      failed,
      tasks,
    },
  } satisfies BulkClaimTasksResponse);
}

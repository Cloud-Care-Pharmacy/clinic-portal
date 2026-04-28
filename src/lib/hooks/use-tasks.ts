import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  BulkClaimTasksRequest,
  BulkClaimTasksResponse,
  BulkTaskResult,
  CreateTaskPayload,
  Task,
  TaskResponse,
  TasksListResponse,
  TasksQuery,
  TaskSummaryResponse,
  UpdateTaskPayload,
} from "@/types";

const EMPTY_TASKS: Task[] = [];

function emptyTasksResponse(opts?: TasksQuery, patientId?: string): TasksListResponse {
  return {
    success: true,
    data: {
      ...(patientId ? { patientId } : {}),
      tasks: EMPTY_TASKS,
      pagination: {
        limit: opts?.limit ?? 50,
        offset: opts?.offset ?? 0,
        total: 0,
      },
      filters: opts,
    },
  };
}

function emptyTaskSummaryResponse(): TaskSummaryResponse {
  return {
    success: true,
    data: {
      openTaskCount: 0,
      inProgressTaskCount: 0,
      overdueTaskCount: 0,
      urgentTaskCount: 0,
      newIntakeTaskCount: 0,
    },
  };
}

function isTaskEndpointUnavailable(status: number) {
  return [404, 500, 501, 502, 503, 504].includes(status);
}

function appendTaskQueryParams(params: URLSearchParams, opts?: TasksQuery) {
  const appendValue = (key: string, value?: string | string[]) => {
    if (!value) return;
    params.set(key, Array.isArray(value) ? value.join(",") : value);
  };

  appendValue("status", opts?.status);
  appendValue("priority", opts?.priority);
  appendValue("taskType", opts?.taskType);
  appendValue("assignedRole", opts?.assignedRole);
  if (opts?.patientId) params.set("patientId", opts.patientId);
  if (opts?.assignedUserId) params.set("assignedUserId", opts.assignedUserId);
  if (opts?.dueBefore) params.set("dueBefore", opts.dueBefore);
  if (opts?.createdAfter) params.set("createdAfter", opts.createdAfter);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.order) params.set("order", opts.order);
  params.set("limit", String(opts?.limit ?? 50));
  params.set("offset", String(opts?.offset ?? 0));
}

function taskQueryKey(prefix: string, opts?: TasksQuery) {
  return [
    prefix,
    Array.isArray(opts?.status) ? opts.status.join(",") : (opts?.status ?? ""),
    Array.isArray(opts?.priority) ? opts.priority.join(",") : (opts?.priority ?? ""),
    Array.isArray(opts?.taskType) ? opts.taskType.join(",") : (opts?.taskType ?? ""),
    opts?.patientId ?? "",
    opts?.assignedUserId ?? "",
    Array.isArray(opts?.assignedRole)
      ? opts.assignedRole.join(",")
      : (opts?.assignedRole ?? ""),
    opts?.dueBefore ?? "",
    opts?.createdAfter ?? "",
    opts?.search ?? "",
    opts?.sort ?? "",
    opts?.order ?? "",
    opts?.limit ?? 50,
    opts?.offset ?? 0,
  ];
}

async function fetchTasks(opts?: TasksQuery): Promise<TasksListResponse> {
  const params = new URLSearchParams();
  appendTaskQueryParams(params, opts);
  const res = await fetch(`/api/proxy/tasks?${params}`);
  if (isTaskEndpointUnavailable(res.status)) return emptyTasksResponse(opts);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

async function fetchPatientTasks(
  patientId: string,
  opts?: Omit<TasksQuery, "patientId">
): Promise<TasksListResponse> {
  const params = new URLSearchParams();
  appendTaskQueryParams(params, opts);
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/tasks?${params}`
  );
  if (isTaskEndpointUnavailable(res.status)) {
    return emptyTasksResponse(opts, patientId);
  }
  if (!res.ok) throw new Error("Failed to fetch patient tasks");
  return res.json();
}

async function fetchTask(taskId: string): Promise<TaskResponse> {
  const res = await fetch(`/api/proxy/tasks/${encodeURIComponent(taskId)}`);
  if (!res.ok) throw new Error("Failed to fetch task");
  return res.json();
}

async function fetchTaskSummary(): Promise<TaskSummaryResponse> {
  const res = await fetch("/api/proxy/tasks/summary");
  if (isTaskEndpointUnavailable(res.status)) return emptyTaskSummaryResponse();
  if (!res.ok) throw new Error("Failed to fetch task summary");
  return res.json();
}

async function createTask(body: CreateTaskPayload): Promise<TaskResponse> {
  const res = await fetch("/api/proxy/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create task" }));
    throw new Error(err.error ?? "Failed to create task");
  }
  return res.json();
}

async function updateTask({
  taskId,
  ...body
}: { taskId: string } & UpdateTaskPayload): Promise<TaskResponse> {
  const res = await fetch(`/api/proxy/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update task" }));
    throw new Error(err.error ?? "Failed to update task");
  }
  return res.json();
}

async function completeTask({
  taskId,
  note,
}: {
  taskId: string;
  note?: string;
}): Promise<TaskResponse> {
  return updateTask({ taskId, status: "completed", note });
}

export function tasksQueryOptions(opts?: TasksQuery) {
  return queryOptions({
    queryKey: taskQueryKey("tasks", opts),
    queryFn: () => fetchTasks(opts),
    placeholderData: keepPreviousData,
  });
}

export function patientTasksQueryOptions(
  patientId: string,
  opts?: Omit<TasksQuery, "patientId">
) {
  return queryOptions({
    queryKey: taskQueryKey("patient-tasks", { ...opts, patientId }),
    queryFn: () => fetchPatientTasks(patientId, opts),
    placeholderData: keepPreviousData,
  });
}

export function useTasks(opts?: TasksQuery, initialData?: TasksListResponse) {
  return useQuery({
    ...tasksQueryOptions(opts),
    initialData,
  });
}

export function usePatientTasks(
  patientId: string | undefined,
  opts?: Omit<TasksQuery, "patientId">,
  initialData?: TasksListResponse
) {
  return useQuery({
    ...patientTasksQueryOptions(patientId ?? "", opts),
    enabled: Boolean(patientId),
    initialData,
  });
}

export function useTask(taskId: string | undefined, initialData?: TaskResponse) {
  return useQuery({
    queryKey: ["task", taskId ?? ""],
    queryFn: () => fetchTask(taskId!),
    enabled: Boolean(taskId),
    initialData,
  });
}

export function useTaskSummary(initialData?: TaskSummaryResponse) {
  return useQuery({
    queryKey: ["task-summary"],
    queryFn: fetchTaskSummary,
    initialData,
  });
}

function invalidateTaskQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  response?: TaskResponse
) {
  const task = response?.data.task;
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  queryClient.invalidateQueries({ queryKey: ["patient-tasks"] });
  queryClient.invalidateQueries({ queryKey: ["task-summary"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] });

  if (task) {
    queryClient.invalidateQueries({ queryKey: ["task", task.taskId] });
    queryClient.invalidateQueries({ queryKey: ["patient-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["patient-counts", task.patientId] });
    queryClient.invalidateQueries({ queryKey: ["patient-activity", task.patientId] });
  }
}

function mergeUpdatedTasks(tasks: Task[], updatedTasks: Task[]) {
  if (updatedTasks.length === 0 || tasks.length === 0) return tasks;

  const updates = new Map(updatedTasks.map((task) => [task.taskId, task]));
  let changed = false;
  const merged = tasks.map((task) => {
    const updated = updates.get(task.taskId);
    if (!updated) return task;
    changed = true;
    return updated;
  });

  return changed ? merged : tasks;
}

function updateBulkTaskCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  result: BulkTaskResult
) {
  const updatedTasks = result.tasks;
  if (updatedTasks.length === 0) return;

  const updateTaskList = (existing: TasksListResponse | undefined) => {
    if (!existing) return existing;
    return {
      ...existing,
      data: {
        ...existing.data,
        tasks: mergeUpdatedTasks(existing.data.tasks, updatedTasks),
      },
    } satisfies TasksListResponse;
  };

  queryClient.setQueriesData<TasksListResponse>(
    { queryKey: ["tasks"] },
    updateTaskList
  );
  queryClient.setQueriesData<TasksListResponse>(
    { queryKey: ["patient-tasks"] },
    updateTaskList
  );

  for (const task of updatedTasks) {
    queryClient.setQueryData<TaskResponse>(["task", task.taskId], (existing) => {
      if (!existing) return existing;
      return {
        ...existing,
        data: {
          ...existing.data,
          task,
        },
      };
    });
  }
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: (response) => invalidateTaskQueries(queryClient, response),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTask,
    onSuccess: (response) => invalidateTaskQueries(queryClient, response),
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeTask,
    onSuccess: (response) => invalidateTaskQueries(queryClient, response),
  });
}

async function claimTasks(body: BulkClaimTasksRequest): Promise<BulkTaskResult> {
  const res = await fetch("/api/proxy/tasks/bulk-claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to claim tasks" }));
    throw new Error(err.error ?? "Failed to claim tasks");
  }

  const payload = (await res.json()) as
    | BulkClaimTasksResponse
    | { success: false; error?: string };
  if (!payload.success) throw new Error(payload.error ?? "Failed to claim tasks");
  return payload.data;
}

export function useClaimTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: claimTasks,
    onSuccess: (result) => updateBulkTaskCaches(queryClient, result),
    onSettled: async (result) => {
      const invalidations: Array<Promise<unknown>> = [];

      invalidations.push(queryClient.invalidateQueries({ queryKey: ["tasks"] }));
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: ["patient-tasks"] })
      );
      invalidations.push(queryClient.invalidateQueries({ queryKey: ["task-summary"] }));
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
      );
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] })
      );

      const affectedTaskIds = new Set(result?.tasks.map((task) => task.taskId) ?? []);
      const affectedPatientIds = new Set(
        result?.tasks.map((task) => task.patientId).filter(Boolean) ?? []
      );
      for (const taskId of affectedTaskIds) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ["task", taskId] })
        );
      }
      for (const patientId of affectedPatientIds) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ["patient-counts", patientId] })
        );
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ["patient-activity", patientId] })
        );
      }
      await Promise.all(invalidations);
    },
  });
}

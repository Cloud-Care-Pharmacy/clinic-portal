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
  TaskQueuePresetsResponse,
  TaskResponse,
  TasksListResponse,
  TasksQuery,
  TaskSummaryResponse,
  UpdateTaskPayload,
} from "@/types";

const TASK_API_UNAVAILABLE = "Task API is not available in this backend environment.";

export class TaskApiError extends Error {
  readonly code?: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "TaskApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function taskErrorPayload(
  res: Response,
  fallback: string
): Promise<TaskApiError> {
  const payload = (await res.json().catch(() => undefined)) as
    | {
        error?: string | { code?: string; message?: string; details?: unknown };
        details?: string;
        code?: string;
      }
    | undefined;

  // New envelope: { success:false, error: { code, message, details } }
  if (payload && typeof payload.error === "object" && payload.error !== null) {
    return new TaskApiError(
      payload.error.message ?? fallback,
      res.status,
      payload.error.code,
      payload.error.details
    );
  }

  const message =
    payload?.details ??
    (typeof payload?.error === "string" ? payload.error : undefined) ??
    (res.status === 404 || res.status === 501 ? TASK_API_UNAVAILABLE : fallback);

  return new TaskApiError(message, res.status, payload?.code);
}

async function assertTaskResponse(res: Response, fallback: string) {
  if (res.ok) return;
  throw await taskErrorPayload(res, fallback);
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
  if (opts?.all) {
    params.set("all", "true");
  } else {
    params.set("limit", String(opts?.limit ?? 50));
    params.set("offset", String(opts?.offset ?? 0));
  }
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
    opts?.all ? "all" : (opts?.limit ?? 50),
    opts?.all ? 0 : (opts?.offset ?? 0),
  ];
}

async function fetchTasks(opts?: TasksQuery): Promise<TasksListResponse> {
  const params = new URLSearchParams();
  appendTaskQueryParams(params, opts);
  const res = await fetch(`/api/proxy/tasks?${params}`);
  await assertTaskResponse(res, "Failed to fetch tasks");
  return res.json();
}

async function fetchAllTasks(opts?: TasksQuery): Promise<TasksListResponse> {
  const response = await fetchTasks({ ...opts, all: true });
  if (response.data.pagination?.truncated && process.env.NODE_ENV !== "production") {
    console.warn(
      "[tasks] /api/tasks?all=true was truncated at the server cap (2000 rows)."
    );
  }
  return response;
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
  await assertTaskResponse(res, "Failed to fetch patient tasks");
  return res.json();
}

async function fetchTask(taskId: string): Promise<TaskResponse> {
  const res = await fetch(`/api/proxy/tasks/${encodeURIComponent(taskId)}`);
  await assertTaskResponse(res, "Failed to fetch task");
  return res.json();
}

async function fetchTaskSummary(): Promise<TaskSummaryResponse> {
  const res = await fetch("/api/proxy/tasks/summary");
  await assertTaskResponse(res, "Failed to fetch task summary");
  return res.json();
}

async function fetchTaskPresets(): Promise<TaskQueuePresetsResponse> {
  const res = await fetch("/api/proxy/tasks/presets");
  await assertTaskResponse(res, "Failed to fetch task presets");
  return res.json();
}

async function createTask(body: CreateTaskPayload): Promise<TaskResponse> {
  const res = await fetch("/api/proxy/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await assertTaskResponse(res, "Failed to create task");
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
  await assertTaskResponse(res, "Failed to update task");
  return res.json();
}

async function completeTask({
  taskId,
  note,
}: {
  taskId: string;
  note?: string;
}): Promise<TaskResponse> {
  const res = await fetch(`/api/proxy/tasks/${encodeURIComponent(taskId)}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  await assertTaskResponse(res, "Failed to complete task");
  return res.json();
}

export function tasksQueryOptions(opts?: TasksQuery) {
  return queryOptions({
    queryKey: taskQueryKey("tasks", opts),
    queryFn: () => fetchTasks(opts),
    placeholderData: keepPreviousData,
  });
}

export function allTasksQueryOptions(opts?: TasksQuery) {
  return queryOptions({
    queryKey: taskQueryKey("tasks-all", opts),
    queryFn: () => fetchAllTasks(opts),
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

export function useAllTasks(opts?: TasksQuery, initialData?: TasksListResponse) {
  return useQuery({
    ...allTasksQueryOptions(opts),
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

export function useTaskPresets() {
  return useQuery({
    queryKey: ["task-presets"],
    queryFn: fetchTaskPresets,
    // Presets are config; cache aggressively.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
  });
}

function invalidateTaskQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  response?: TaskResponse
) {
  const task = response?.data.task;
  queryClient.invalidateQueries({ queryKey: ["tasks-all"] });
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
    { queryKey: ["tasks-all"] },
    updateTaskList
  );
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
    throw await taskErrorPayload(res, "Failed to claim tasks");
  }

  const payload = (await res.json()) as
    | BulkClaimTasksResponse
    | { success: false; error?: string };
  if (!payload.success)
    throw new TaskApiError(payload.error ?? "Failed to claim tasks", res.status);
  return payload.data;
}

export function useClaimTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: claimTasks,
    onSuccess: (result) => updateBulkTaskCaches(queryClient, result),
    onSettled: async (result) => {
      const invalidations: Array<Promise<unknown>> = [];

      invalidations.push(queryClient.invalidateQueries({ queryKey: ["tasks-all"] }));
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

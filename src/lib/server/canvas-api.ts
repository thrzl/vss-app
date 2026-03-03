/**
 * Canvas LMS API client
 *
 * Talks to the Canvas REST API to fetch the current user's courses and
 * assignments.  Every function accepts the base Canvas URL and an API
 * token so the module stays stateless.
 */

// ---------------------------------------------------------------------------
// Types – Canvas API response shapes (only the fields we care about)
// ---------------------------------------------------------------------------

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  workflow_state: string; // "available" | "completed" | …
  enrollments?: { type: string; enrollment_state: string }[];
}

export interface CanvasSubmission {
  submitted_at: string | null;
  score: number | null;
  grade: string | null;
  workflow_state: string; // "submitted" | "unsubmitted" | "graded" | "pending_review"
  late: boolean;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null; // ISO 8601
  lock_at: string | null;
  unlock_at: string | null;
  course_id: number;
  html_url: string;
  has_submitted_submissions: boolean;
  submission?: CanvasSubmission;
  workflow_state: string; // "published" | "unpublished" | …
  updated_at: string; // ISO 8601
  points_possible: number | null;
  submission_types: string[];
}

/** Normalised assignment ready to be compared / merged with a local task. */
export interface NormalisedCanvasTask {
  canvasId: string; // `${courseId}_${assignmentId}` – unique across courses
  canvasCourseId: string;
  title: string;
  description: string | null; // plain-text description (HTML stripped)
  dueAt: string | null; // ISO 8601 or null
  url: string; // html_url of the assignment
  isCompleted: boolean; // derived from submission state
  canvasUpdatedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags from a string and collapse whitespace, returning plain text.
 * Returns `null` if the input is null/empty or becomes empty after stripping.
 */
// Placeholder descriptions that Canvas inserts by default and carry no
// real information.  We treat these as absent so users see "No description"
// rather than a meaningless stub.
const CANVAS_DESCRIPTION_PLACEHOLDERS = new Set([
  "description",
  "no description",
  "n/a",
  "none",
  "tbd",
  "to be determined",
]);

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  const text = html
    .replace(/<br\s*\/?>/gi, "\n") // preserve line breaks
    .replace(/<\/p>/gi, "\n\n") // paragraph breaks
    .replace(/<\/li>/gi, "\n") // list item breaks
    .replace(/<[^>]*>/g, "") // strip all remaining tags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n") // collapse excessive newlines
    .trim();
  if (text.length === 0) return null;
  // Discard known boilerplate placeholders (case-insensitive)
  if (CANVAS_DESCRIPTION_PLACEHOLDERS.has(text.toLowerCase())) return null;
  return text;
}

const PER_PAGE = 100; // Canvas max per_page

/**
 * Perform a paginated GET against the Canvas API, following `Link: <…>;
 * rel="next"` headers automatically.  Returns every item across all pages.
 */
async function paginatedGet<T>(
  baseUrl: string,
  path: string,
  token: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const items: T[] = [];
  const url = new URL(path, baseUrl);

  // Merge caller params
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set("per_page", String(PER_PAGE));

  let next: string | null = url.toString();

  while (next) {
    const res = await fetch(next, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CanvasApiError(
        `Canvas API ${res.status} on ${next}: ${body}`,
        res.status,
      );
    }

    const data: T[] = await res.json();
    items.push(...data);

    // Follow pagination
    next = parseLinkNext(res.headers.get("Link"));
  }

  return items;
}

/** Extract the `rel="next"` URL from Canvas's Link header. */
function parseLinkNext(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/<([^>]+)>;\s*rel="next"/);
  return match?.[1] ?? null;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class CanvasApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CanvasApiError";
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch all active courses the user is enrolled in as a student.
 */
export async function fetchCourses(
  canvasUrl: string,
  token: string,
): Promise<CanvasCourse[]> {
  const courses = await paginatedGet<CanvasCourse>(
    canvasUrl,
    "/api/v1/courses",
    token,
    {
      enrollment_type: "student",
      enrollment_state: "active",
      "state[]": "available",
    },
  );

  return courses;
}

/**
 * Fetch all *published* assignments for a single course, including the
 * current user's submission (so we can determine completion status).
 */
export async function fetchAssignmentsForCourse(
  canvasUrl: string,
  token: string,
  courseId: number,
): Promise<CanvasAssignment[]> {
  const assignments = await paginatedGet<CanvasAssignment>(
    canvasUrl,
    `/api/v1/courses/${courseId}/assignments`,
    token,
    {
      "include[]": "submission",
      order_by: "due_at",
    },
  );

  // Only keep published assignments
  return assignments.filter((a) => a.workflow_state === "published");
}

/**
 * Fetch assignments across *all* active courses and return a flat list of
 * normalised tasks.
 */
export async function fetchAllCanvasTasks(
  canvasUrl: string,
  token: string,
): Promise<NormalisedCanvasTask[]> {
  const courses = await fetchCourses(canvasUrl, token);

  // Fetch assignments for each course in parallel (bounded to avoid
  // hammering the API – Canvas rate-limits at ~100 req/min).
  const CONCURRENCY = 5;
  const allTasks: NormalisedCanvasTask[] = [];

  for (let i = 0; i < courses.length; i += CONCURRENCY) {
    const batch = courses.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (course) => {
        try {
          const assignments = await fetchAssignmentsForCourse(
            canvasUrl,
            token,
            course.id,
          );
          return assignments.map((a) => normaliseAssignment(a, course));
        } catch (err) {
          // If one course fails (e.g. restricted permissions), skip it
          // instead of aborting the entire sync.
          console.error(
            `[canvas-api] Failed to fetch assignments for course ${course.id} (${course.name}):`,
            err,
          );
          return [];
        }
      }),
    );
    allTasks.push(...results.flat());
  }

  return allTasks;
}

/**
 * Verify that a Canvas API token is valid by hitting a lightweight
 * endpoint.  Returns `true` if the token works, `false` otherwise.
 */
export async function verifyToken(
  canvasUrl: string,
  token: string,
): Promise<boolean> {
  try {
    const res = await fetch(new URL("/api/v1/users/self", canvasUrl), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

function normaliseAssignment(
  assignment: CanvasAssignment,
  course: CanvasCourse,
): NormalisedCanvasTask {
  const submission = assignment.submission;

  // An assignment is "completed" when the student has a graded or submitted
  // submission.  We intentionally treat "pending_review" as completed since
  // the student has done their part.
  const isCompleted =
    !!submission &&
    (submission.workflow_state === "graded" ||
      submission.workflow_state === "submitted" ||
      submission.workflow_state === "pending_review");

  const courseName = course.course_code || course.name;
  const title = `[${courseName.split("-").slice(0, 2).join("-")}] ${assignment.name}`;

  return {
    canvasId: `${course.id}_${assignment.id}`,
    canvasCourseId: String(course.id),
    title,
    description: stripHtml(assignment.description),
    dueAt: assignment.due_at,
    url: assignment.html_url,
    isCompleted,
    canvasUpdatedAt: assignment.updated_at,
  };
}

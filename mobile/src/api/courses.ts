import { apiClient, getApiErrorMessage, type ApiSuccess } from "@/src/api/client";
import type {
  CourseItem,
  CreateCoursePayload,
  UpdateCoursePayload,
} from "@/src/types/course";

export const coursesQueryKeys = {
  all: ["courses"] as const,
  list: () => ["courses", "list"] as const,
  detail: (id: string) => ["courses", "detail", id] as const,
};

export async function listCourses(): Promise<CourseItem[]> {
  try {
    const response = await apiClient.get<ApiSuccess<CourseItem[]>>("/api/courses");
    return response.data.data ?? [];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function getCourse(id: string): Promise<CourseItem> {
  try {
    const response = await apiClient.get<ApiSuccess<CourseItem>>(`/api/courses/${id}`);
    const payload = response.data.data;
    if (!payload?.id) {
      throw new Error("استجابة غير صالحة من الخادم");
    }
    return payload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createCourse(payload: CreateCoursePayload): Promise<CourseItem> {
  try {
    const response = await apiClient.post<ApiSuccess<CourseItem>>(
      "/api/courses",
      payload
    );
    const data = response.data.data;
    if (!data?.id) {
      throw new Error("استجابة غير صالحة من الخادم");
    }
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function updateCourse(
  id: string,
  payload: UpdateCoursePayload
): Promise<CourseItem> {
  try {
    const response = await apiClient.put<ApiSuccess<CourseItem>>(
      `/api/courses/${id}`,
      payload
    );
    const data = response.data.data;
    if (!data?.id) {
      throw new Error("استجابة غير صالحة من الخادم");
    }
    return data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function deleteCourse(
  id: string
): Promise<{ id: string; message: string }> {
  try {
    const response = await apiClient.delete<
      ApiSuccess<{ id: string; message: string }>
    >(`/api/courses/${id}`);
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

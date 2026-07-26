export interface CourseItem {
  id: string;
  centerId: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
}

export interface CreateCoursePayload {
  name: string;
  description?: string;
}

export type UpdateCoursePayload = Partial<CreateCoursePayload>;

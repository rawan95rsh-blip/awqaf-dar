import { apiClient, getApiErrorMessage, type ApiSuccess } from "@/src/api/client";
import type {
  ClassOfferItem,
  CreateClassOfferPayload,
  ListClassOffersParams,
} from "@/src/types/classOffer";
import type { LevelListItem } from "@/src/types/level";
import {
  MUTOR_LEVEL_ORDER_MAX,
  MUTOR_LEVEL_ORDER_MIN,
} from "@/src/types/classOffer";

export const classOffersQueryKeys = {
  all: ["class-offers"] as const,
  list: (params?: ListClassOffersParams) =>
    ["class-offers", "list", params ?? {}] as const,
  detail: (id: string) => ["class-offers", "detail", id] as const,
};

export function isMutorLevel(level: Pick<LevelListItem, "order">): boolean {
  return (
    level.order >= MUTOR_LEVEL_ORDER_MIN && level.order <= MUTOR_LEVEL_ORDER_MAX
  );
}

export function filterMutorLevels<T extends Pick<LevelListItem, "order">>(
  levels: T[]
): T[] {
  return levels.filter(isMutorLevel);
}

export async function listClassOffers(
  params?: ListClassOffersParams
): Promise<ClassOfferItem[]> {
  try {
    const response = await apiClient.get<ApiSuccess<ClassOfferItem[]>>(
      "/api/class-offers",
      { params }
    );
    return response.data.data ?? [];
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function getClassOffer(id: string): Promise<ClassOfferItem> {
  try {
    const response = await apiClient.get<ApiSuccess<ClassOfferItem>>(
      `/api/class-offers/${id}`
    );
    const payload = response.data.data;
    if (!payload?.id) {
      throw new Error("استجابة غير صالحة من الخادم");
    }
    return payload;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

export async function createClassOffer(
  payload: CreateClassOfferPayload
): Promise<ClassOfferItem> {
  try {
    const response = await apiClient.post<ApiSuccess<ClassOfferItem>>(
      "/api/class-offers",
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

export async function deleteClassOffer(
  id: string
): Promise<{ id: string; message: string }> {
  try {
    const response = await apiClient.delete<
      ApiSuccess<{ id: string; message: string }>
    >(`/api/class-offers/${id}`);
    return response.data.data;
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}

import { apiClient, getApiErrorMessage, type ApiSuccess } from "@/src/api/client";
import type {
  ClassOfferItem,
  CreateClassOfferPayload,
  ListClassOffersParams,
} from "@/src/types/classOffer";
import type { LevelListItem } from "@/src/types/level";
import type { LevelTrack } from "@/src/constants/domain";

export const classOffersQueryKeys = {
  all: ["class-offers"] as const,
  list: (params?: ListClassOffersParams) =>
    ["class-offers", "list", params ?? {}] as const,
  detail: (id: string) => ["class-offers", "detail", id] as const,
};

export function levelsOfTrack<T extends Pick<LevelListItem, "track" | "order">>(
  levels: T[],
  track: LevelTrack
): T[] {
  return levels.filter((level) => level.track === track).sort((a, b) => a.order - b.order);
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

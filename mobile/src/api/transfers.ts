import { apiClient, request, type ApiSuccess } from "@/src/api/client";

export type TransferStatus = "pending_source" | "pending_destination" | "approved" | "rejected" | "cancelled";

export interface TransferItem {
  id: string;
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  studentLevelName: string;
  fromCenterId: string;
  fromCenterName: string;
  toCenterId: string;
  toCenterName: string;
  initiatedBy: "student" | "center";
  reason: string;
  status: TransferStatus;
  rejectionReason: string;
  direction?: "incoming" | "outgoing";
  createdAt?: string;
  message?: string;
}

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  pending_source: "بانتظار موافقة المركز الحالي",
  pending_destination: "بانتظار قبول المركز الجديد",
  approved: "تم النقل",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

export const transferQueryKeys = {
  center: ["transfers", "center"] as const,
  mine: ["transfers", "me"] as const,
};

export async function listCenterTransfers(): Promise<TransferItem[]> {
  return (await request(() => apiClient.get<ApiSuccess<TransferItem[]>>("/api/transfer-requests"))) ?? [];
}

export async function listMyTransfers(): Promise<TransferItem[]> {
  return (await request(() => apiClient.get<ApiSuccess<TransferItem[]>>("/api/transfer-requests/me"))) ?? [];
}

export function createTransfer(body: { studentId: string; toCenterId: string; reason?: string }): Promise<TransferItem> {
  return request(() => apiClient.post<ApiSuccess<TransferItem>>("/api/transfer-requests", body));
}

export function requestMyTransfer(body: { toCenterId: string; reason: string }): Promise<TransferItem> {
  return request(() => apiClient.post<ApiSuccess<TransferItem>>("/api/transfer-requests/me", body));
}

export function approveTransfer(id: string, levelId?: string): Promise<TransferItem> {
  return request(() =>
    apiClient.patch<ApiSuccess<TransferItem>>(`/api/transfer-requests/${id}/approve`, levelId ? { levelId } : {})
  );
}

export function rejectTransfer(id: string, reason: string): Promise<TransferItem> {
  return request(() => apiClient.patch<ApiSuccess<TransferItem>>(`/api/transfer-requests/${id}/reject`, { reason }));
}

export function cancelTransfer(id: string): Promise<{ id: string; message: string }> {
  return request(() => apiClient.patch<ApiSuccess<{ id: string; message: string }>>(`/api/transfer-requests/${id}/cancel`));
}

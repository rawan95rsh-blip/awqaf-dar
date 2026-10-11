import { useQuery } from "@tanstack/react-query";
import { listPendingRequests, registrationQueryKeys } from "@/src/api/registrationRequests";
import { listCenterTransfers, transferQueryKeys } from "@/src/api/transfers";
import { listSuspensionRequests, suspensionRequestQueryKeys } from "@/src/api/suspensionRequests";
import { deletionRequestQueryKeys, listAccountDeletionRequests } from "@/src/api/accountDeletionRequests";

/** كل الطلبات المعلقة للمركز — تُستخدم في صفحة الطلبات وشارة التبويب */
export function useCenterInbox(enabled = true) {
  const registrations = useQuery({
    queryKey: registrationQueryKeys.pending,
    queryFn: listPendingRequests,
    enabled,
  });
  const transfers = useQuery({
    queryKey: transferQueryKeys.center,
    queryFn: listCenterTransfers,
    enabled,
  });
  const suspensions = useQuery({
    queryKey: suspensionRequestQueryKeys.list("pending"),
    queryFn: () => listSuspensionRequests("pending"),
    enabled,
  });
  const deletions = useQuery({
    queryKey: deletionRequestQueryKeys.list("pending"),
    queryFn: () => listAccountDeletionRequests("pending"),
    enabled,
  });

  const actionableTransfers = (transfers.data ?? []).filter(
    (t) =>
      (t.direction === "incoming" && t.status === "pending_destination") ||
      (t.direction === "outgoing" && t.status === "pending_source")
  );

  const total =
    (registrations.data?.length ?? 0) +
    actionableTransfers.length +
    (suspensions.data?.length ?? 0) +
    (deletions.data?.length ?? 0);

  const refetchAll = () =>
    Promise.all([registrations.refetch(), transfers.refetch(), suspensions.refetch(), deletions.refetch()]);

  return {
    registrations,
    transfers,
    suspensions,
    deletions,
    actionableTransfers,
    total,
    isLoading: registrations.isLoading,
    isRefetching:
      registrations.isRefetching || transfers.isRefetching || suspensions.isRefetching || deletions.isRefetching,
    refetchAll,
  };
}

import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import type { UseQueryResult } from "@tanstack/react-query";
import { space } from "@/src/theme";
import { Badge, EmptyState, ErrorState, SkeletonList, Text } from "@/src/ui";
import type { RegistrationRequestItem } from "@/src/api/registrationRequests";
import { STUDENT_TYPE_LABELS, TRACK_LABELS } from "@/src/constants/domain";
import RequestCard from "./RequestCard";

export function registrationSummary(request: Pick<RegistrationRequestItem, "track" | "requestedLevelName">): string {
  return [TRACK_LABELS[request.track], request.requestedLevelName].filter(Boolean).join(" · ");
}

/** قائمة طلبات التسجيل — الضغط يفتح صفحة المراجعة الكاملة */
export default function RegistrationRequestList({
  query,
}: {
  query: UseQueryResult<RegistrationRequestItem[], Error>;
}) {
  const router = useRouter();

  if (query.isLoading) return <SkeletonList rows={4} />;
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;

  const requests = query.data ?? [];
  if (requests.length === 0) {
    return (
      <EmptyState
        icon="account-plus-outline"
        title="لا توجد طلبات تسجيل جديدة"
        description="تصلكِ هنا طلبات الطالبات المسجّلات من التطبيق لمراجعة بياناتهن ومرفقاتهن قبل القبول."
      />
    );
  }

  return (
    <View style={styles.list}>
      <Text variant="caption" color="textSecondary">
        اضغطي على الطلب لمراجعة البيانات والمرفقات ثم القبول أو الرفض.
      </Text>
      {requests.map((request) => {
        const documentsCount = Object.values(request.documents ?? {}).filter(Boolean).length;
        return (
          <RequestCard
            key={request.id}
            name={request.fullName}
            subtitle={registrationSummary(request)}
            createdAt={request.createdAt}
            onPress={() => router.push(`/main/request/${request.id}` as Href)}
            accessibilityLabel={`طلب تسجيل ${request.fullName} — ${registrationSummary(request)}`}
            badges={
              <>
                <Badge
                  label={STUDENT_TYPE_LABELS[request.studentType] ?? "مستجدة"}
                  tone={request.studentType === "continuing" ? "accent" : "info"}
                  size="sm"
                />
                {request.courses.length ? (
                  <Badge label={`${request.courses.length} دورة`} tone="neutral" icon="certificate-outline" size="sm" />
                ) : null}
                <Badge
                  label={`${documentsCount}/3 مرفقات`}
                  tone={documentsCount >= 2 ? "success" : "warning"}
                  icon="paperclip"
                  size="sm"
                />
              </>
            }
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3] },
});

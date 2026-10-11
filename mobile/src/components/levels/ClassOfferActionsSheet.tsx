import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { space } from "@/src/theme";
import { Card, InfoRow, ListItem, LoadingState, Sheet, useToast } from "@/src/ui";
import { classOffersQueryKeys, deleteClassOffer } from "@/src/api/classOffers";
import { sessionsQueryKeys } from "@/src/api/sessions";
import { WEEKDAYS } from "@/src/constants/domain";
import { MODE_LABELS, TRACK_LABELS, type ClassOfferItem } from "@/src/types/classOffer";
import { confirmAsync } from "./confirm";
import { timeRangeLabel } from "./helpers";

/**
 * خيارات فصل متكرر (ضغط مطوّل أو زر ⋮): فتح الحصة القادمة، صفحة المادة، حذف الفصل.
 * الحذف يزيل الفصل وكل حصصه المجدولة بعد تأكيد صريح.
 */
export default function ClassOfferActionsSheet({
  offer: currentOffer,
  onClose,
  showSubjectLink = true,
}: {
  offer: ClassOfferItem | null;
  onClose: () => void;
  showSubjectLink?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  // نحتفظ بآخر فصل معروض حتى لا يختفي المحتوى أثناء حركة الإغلاق
  const lastOffer = useRef<ClassOfferItem | null>(null);
  if (currentOffer) lastOffer.current = currentOffer;
  const offer = currentOffer ?? lastOffer.current;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClassOffer(id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: classOffersQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionsQueryKeys.all });
      toast.success(result?.message ?? "تم حذف الفصل وحصصه");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const go = (href: string) => {
    onClose();
    router.push(href as Href);
  };

  const askDelete = async () => {
    if (!offer) return;
    const ok = await confirmAsync({
      title: `حذف فصل «${offer.subjectName}»؟`,
      message: `سيُحذف موعد ${WEEKDAYS[offer.weekday]} ${timeRangeLabel(offer.startTime, offer.endTime)} وكل حصصه المجدولة من الجدول. لا يمكن التراجع.`,
      confirmLabel: "حذف الفصل",
      destructive: true,
    });
    if (ok) deleteMutation.mutate(offer.id);
  };

  return (
    <Sheet
      visible={!!currentOffer}
      onClose={deleteMutation.isPending ? () => undefined : onClose}
      title={offer?.subjectName}
      subtitle={offer ? `${TRACK_LABELS[offer.track]}${offer.levelLabel ? ` · ${offer.levelLabel}` : ""}` : undefined}
    >
      {offer ? (
        <>
          <Card padding={3}>
            <InfoRow label="الموعد" icon="calendar-clock-outline" value={`${WEEKDAYS[offer.weekday]} · ${timeRangeLabel(offer.startTime, offer.endTime)}`} />
            <InfoRow label="المعلمة" icon="account-tie-outline" value={offer.teacherName} />
            <InfoRow label="طريقة الحضور" icon="map-marker-outline" value={MODE_LABELS[offer.mode]} last />
          </Card>
          {deleteMutation.isPending ? (
            <LoadingState label="جاري حذف الفصل…" />
          ) : (
            <View style={styles.actions}>
              {offer.nextSessionId ? (
                <ListItem
                  title="فتح الحصة القادمة"
                  subtitle="التحضير واعتذار المعلمة ورابط Zoom"
                  leadingIcon="calendar-arrow-right"
                  onPress={() => go(`/main/session/${offer.nextSessionId}`)}
                />
              ) : null}
              {showSubjectLink && offer.levelId ? (
                <ListItem
                  title="صفحة المادة"
                  subtitle="كشف التحضير وسجل الدرجات"
                  leadingIcon="book-open-variant"
                  onPress={() => go(`/main/subject/${offer.levelId}/${offer.subjectIndex}`)}
                />
              ) : null}
              <ListItem
                title="حذف الفصل"
                subtitle="يحذف الفصل وحصصه من الجدول"
                leadingIcon="trash-can-outline"
                destructive
                chevron={false}
                onPress={() => void askDelete()}
              />
            </View>
          )}
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space[1], marginHorizontal: -space[4] },
});

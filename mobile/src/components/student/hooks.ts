import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCurrentStudent, studentQueryKeys } from "@/src/api/students";
import { fetchStudentAttendance, fetchStudentGrades, gradesQueryKeys } from "@/src/api/grades";
import { fetchMyNotifications, markNotificationReadApi, notificationsQueryKeys } from "@/src/api/notifications";
import { listMyTransfers, transferQueryKeys } from "@/src/api/transfers";
import { listMySessions, sessionsQueryKeys } from "@/src/api/sessions";
import type { ListSessionsParams } from "@/src/types/session";

/**
 * استعلامات واجهة الطالبة — مفاتيح موحّدة حتى تتشارك الشاشات نفس الذاكرة المؤقتة.
 */

export function useMyProfile() {
  return useQuery({ queryKey: studentQueryKeys.me(), queryFn: fetchCurrentStudent });
}

export function useMyNotifications() {
  return useQuery({
    queryKey: notificationsQueryKeys.mine,
    queryFn: fetchMyNotifications,
    staleTime: 30_000,
  });
}

/** يعيد جلب الإشعارات كلما عادت الشاشة للواجهة (مثل فتح التطبيق من إشعار) */
export function useRefetchNotificationsOnFocus(refetch: () => unknown) {
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => markNotificationReadApi(id)));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.mine });
    },
  });
}

export function useMyTransfers(enabled = true) {
  return useQuery({ queryKey: transferQueryKeys.mine, queryFn: listMyTransfers, enabled });
}

export function useMyAttendance(studentId: string | undefined) {
  return useQuery({
    queryKey: gradesQueryKeys.studentAttendance(studentId ?? ""),
    queryFn: () => fetchStudentAttendance(studentId!),
    enabled: !!studentId,
  });
}

export function useMyGrades(studentId: string | undefined) {
  return useQuery({
    queryKey: gradesQueryKeys.student(studentId ?? ""),
    queryFn: () => fetchStudentGrades(studentId!),
    enabled: !!studentId,
  });
}

export function useMySessions(range: ListSessionsParams) {
  return useQuery({
    queryKey: sessionsQueryKeys.mine(range),
    queryFn: () => listMySessions(range),
  });
}

/** ساعة حيّة — تُحدّث العدّ التنازلي ونافذة التحضير دون سحب للتحديث */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

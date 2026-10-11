import { useEffect } from "react";
import { useNavigation } from "expo-router";
import { confirmAsync } from "./confirm";

/**
 * يمنع مغادرة الشاشة بتعديلات غير محفوظة (زر الرجوع، إيماءة السحب، زر النظام)
 * ويسأل المشرفة قبل تجاهلها.
 */
export function useUnsavedChangesGuard(dirty: boolean, message = "لديكِ تعديلات لم تُحفظ بعد. هل تريدين الخروج دون حفظ؟") {
  const navigation = useNavigation();

  useEffect(() => {
    if (!dirty) return undefined;
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      event.preventDefault();
      void confirmAsync({
        title: "تعديلات غير محفوظة",
        message,
        confirmLabel: "خروج دون حفظ",
        cancelLabel: "متابعة التعديل",
        destructive: true,
      }).then((leave) => {
        if (leave) navigation.dispatch(event.data.action);
      });
    });
    return unsubscribe;
  }, [dirty, message, navigation]);
}

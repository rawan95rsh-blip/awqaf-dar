import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius, space } from "@/src/theme";
import { IconButton, Text } from "@/src/ui";
import { useAuthImageSource } from "@/src/hooks/useAuthImage";
import { DOCUMENT_META, type DocumentKind } from "@/src/constants/domain";
import type { DocumentEntry } from "@/src/types/student";

function Thumb({ kind, entry, onOpen }: { kind: DocumentKind; entry: DocumentEntry; onOpen: () => void }) {
  const source = useAuthImageSource(entry?.url);
  const meta = DOCUMENT_META[kind];
  return (
    <Pressable
      onPress={onOpen}
      disabled={!entry}
      accessibilityRole="imagebutton"
      accessibilityLabel={`${meta.label}${entry ? "" : " — غير مرفق"}`}
      style={({ pressed }) => [styles.thumb, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.thumbImage}>
        {source ? (
          <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <MaterialCommunityIcons name={meta.icon} size={26} color={colors.textMuted} />
        )}
      </View>
      <Text variant="micro" align="center" numberOfLines={2} color={entry ? "text" : "textMuted"}>
        {entry ? meta.label : `${meta.label} (غير مرفق)`}
      </Text>
    </Pressable>
  );
}

function FullImage({ url }: { url: string }) {
  const source = useAuthImageSource(url);
  return source ? <Image source={source} style={styles.full} resizeMode="contain" /> : null;
}

/** معرض مرفقات الطالبة (البطاقة المدنية / الصورة / المؤهل) */
export default function DocumentViewer({ documents }: { documents: Record<DocumentKind, DocumentEntry> }) {
  const [open, setOpen] = useState<DocumentKind | null>(null);
  const kinds: DocumentKind[] = ["civilId", "photo", "qualification"];
  return (
    <>
      <View style={styles.row}>
        {kinds.map((kind) => (
          <Thumb key={kind} kind={kind} entry={documents[kind]} onOpen={() => setOpen(kind)} />
        ))}
      </View>
      <Modal visible={!!open} animationType="fade" onRequestClose={() => setOpen(null)}>
        <SafeAreaView style={styles.viewer}>
          <View style={styles.viewerBar}>
            <Text variant="headline" style={styles.viewerTitle}>
              {open ? DOCUMENT_META[open].label : ""}
            </Text>
            <IconButton icon="close" accessibilityLabel="إغلاق" color={colors.onPrimary} onPress={() => setOpen(null)} />
          </View>
          {open && documents[open] ? <FullImage url={documents[open]!.url} /> : null}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space[3] },
  thumb: { flex: 1, gap: space[2] },
  thumbImage: {
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  viewer: { flex: 1, backgroundColor: "#0B0F0D" },
  viewerBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: space[4], paddingVertical: space[2] },
  viewerTitle: { flex: 1, color: colors.onPrimary },
  full: { flex: 1 },
});

import { forwardRef, useRef, useState, type ForwardedRef } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { colors, radius, space } from "@/src/theme";
import { Avatar, Badge, Button, Sheet, Text, TextField } from "@/src/ui";
import type { GradeWeights } from "@/src/constants/grades";
import type { GradeBreakdown } from "@/src/types/grades";
import type { StudentListItem } from "@/src/types/student";
import { WEIGHT_FIELDS, gradeLabel, gradeTone, parseScore } from "./helpers";

/**
 * رصد درجات طالبة واحدة: 4 خانات محدودة بأوزان المركز + مجموع وتقدير مباشر.
 * «التالية» تنقل للطالبة التالية دون إغلاق اللوحة لرصد سريع للفصل كله.
 */
export default function GradeEditorSheet({
  student,
  position,
  breakdown,
  weights,
  onChange,
  onPrev,
  onNext,
  onClose,
}: {
  student: StudentListItem | null;
  position: string;
  breakdown: GradeBreakdown;
  weights: GradeWeights;
  onChange: (breakdown: GradeBreakdown) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
}) {
  const total = breakdown.attendance + breakdown.shortExam + breakdown.participation + breakdown.final;
  const inputs = useRef<Array<TextInput | null>>([]);

  return (
    <Sheet
      visible={!!student}
      onClose={onClose}
      title={student?.fullName}
      subtitle={position}
      footer={
        <View style={styles.footer}>
          <Button variant="secondary" icon="chevron-right" onPress={onPrev} disabled={!onPrev} style={styles.flex}>
            السابقة
          </Button>
          {onNext ? (
            <Button icon="chevron-left" iconPosition="end" onPress={onNext} style={styles.flex}>
              التالية
            </Button>
          ) : (
            <Button icon="check" onPress={onClose} style={styles.flex}>
              تم
            </Button>
          )}
        </View>
      }
    >
      {student ? (
        <>
          <View style={styles.totalCard}>
            <Avatar name={student.fullName} uri={student.photoUrl} size={44} tone={gradeTone(total)} />
            <View style={styles.flex}>
              <Text variant="caption" color="textSecondary">
                المجموع
              </Text>
              <Text variant="display" tabular>
                {`${total}`}
                <Text variant="body" color="textMuted">
                  {" / 100"}
                </Text>
              </Text>
            </View>
            <Badge label={gradeLabel(total)} tone={gradeTone(total)} />
          </View>

          <View style={styles.grid}>
            {WEIGHT_FIELDS.map((field, i) => (
              <View key={`${student.id}-${field.key}`} style={styles.cell}>
                <ScoreField
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  label={field.label}
                  max={weights[field.key]}
                  value={breakdown[field.key]}
                  autoFocus={i === 0}
                  last={i === WEIGHT_FIELDS.length - 1}
                  onSubmit={() => (i < WEIGHT_FIELDS.length - 1 ? inputs.current[i + 1]?.focus() : onNext?.())}
                  onChange={(n) => onChange({ ...breakdown, [field.key]: n })}
                />
              </View>
            ))}
          </View>
          <Text variant="caption" color="textMuted">
            الحد الأعلى لكل خانة حسب توزيع درجات المركز، وأي قيمة أعلى تُضبط تلقائياً.
          </Text>
        </>
      ) : null}
    </Sheet>
  );
}

type ScoreFieldProps = {
  label: string;
  max: number;
  value: number;
  autoFocus: boolean;
  last: boolean;
  onSubmit: () => void;
  onChange: (value: number) => void;
};

function ScoreFieldImpl(
  { label, max, value, autoFocus, last, onSubmit, onChange }: ScoreFieldProps,
  ref: ForwardedRef<TextInput>
) {
  // نص محلي يسمح بمسح الخانة أثناء الكتابة دون أن يقفز إلى «0»
  const [text, setText] = useState(value ? String(value) : "");
  const [clamped, setClamped] = useState(false);

  return (
    <TextField
      ref={ref}
      label={label}
      value={text}
      onChangeText={(raw) => {
        const unclamped = parseScore(raw, 999);
        const n = Math.min(unclamped, max);
        setClamped(unclamped > max);
        setText(raw.trim() === "" ? "" : String(n));
        onChange(n);
      }}
      onBlur={() => {
        setText(value ? String(value) : "");
        setClamped(false);
      }}
      placeholder="0"
      keyboardType="number-pad"
      selectTextOnFocus
      autoFocus={autoFocus}
      returnKeyType={last ? "done" : "next"}
      onSubmitEditing={onSubmit}
      blurOnSubmit={last}
      ltr
      maxLength={3}
      error={clamped ? `الحد الأعلى ${max} — ضُبطت القيمة` : null}
      suffix={
        <Text variant="caption" color="textMuted" tabular>
          {`/ ${max}`}
        </Text>
      }
    />
  );
}

const ScoreField = forwardRef<TextInput, ScoreFieldProps>(ScoreFieldImpl);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: "row", gap: space[3] },
  totalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSunken,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  cell: { flexBasis: "46%", flexGrow: 1 },
});

import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Colors } from '@/constants/Colors';

const ITEM_HEIGHT = 48;
const VISIBLE = 5;

const generateTimes = () => {
  const times: { label: string; value: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      times.push({
        label: `${hour}:${String(m).padStart(2, '0')} ${ampm}`,
        value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      });
    }
  }
  return times;
};

const TIMES = generateTimes();

function ScrollPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const ref = useRef<ScrollView>(null);
  const index = TIMES.findIndex(t => t.value === value);

  useEffect(() => {
    if (ref.current && index >= 0) {
      ref.current.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
    }
  }, [index]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    if (i >= 0 && i < TIMES.length) onChange(TIMES[i].value);
  };

  return (
    <View style={s.col}>
      <Text style={s.label}>{label}</Text>
      <View style={s.wheel}>
        <View style={s.highlight} />
        <ScrollView
          ref={ref}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
          onMomentumScrollEnd={onScroll}
        >
          {TIMES.map(t => (
            <View key={t.value} style={s.item}>
              <Text style={[s.itemText, t.value === value && s.selected]}>{t.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

export default function TimePicker({
  startTime, endTime, onStartChange, onEndChange,
}: {
  startTime: string; endTime: string;
  onStartChange: (v: string) => void; onEndChange: (v: string) => void;
}) {
  return (
    <View style={s.row}>
      <ScrollPicker value={startTime} onChange={onStartChange} label="From" />
      <Text style={s.arrow}>→</Text>
      <ScrollPicker value={endTime} onChange={onEndChange} label="To" />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  col: { flex: 1, alignItems: 'center', gap: 8 },
  label: { color: Colors.subtext, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  wheel: { height: ITEM_HEIGHT * VISIBLE, overflow: 'hidden', width: '100%', backgroundColor: Colors.card, borderRadius: 12 },
  highlight: { position: 'absolute', top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT, left: 0, right: 0, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border, zIndex: 1 },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText: { color: Colors.subtext, fontSize: 15 },
  selected: { color: Colors.text, fontSize: 17, fontWeight: '700' },
  arrow: { color: Colors.subtext, fontSize: 20, marginTop: 24 },
});

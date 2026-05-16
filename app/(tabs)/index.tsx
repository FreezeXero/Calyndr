import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Modal, Platform, Pressable,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { primaryButton } from '@/constants/primaryButton';
import { CalEvent } from '@/types';
import { getEvents } from '@/lib/storage';
import { HOLIDAYS_2026 } from '@/constants/Holidays';
import EventCard from '@/components/EventCard';
import WebPage from '@/components/WebPage';
import { isWeb } from '@/constants/layout';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CalendarScreen() {
  const today = new Date();
  const router = useRouter();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [weekStart, setWeekStart] = useState(getWeekStart(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDay, setModalDay] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    getEvents().then(stored => setEvents([...stored, ...HOLIDAYS_2026]));
  }, []));

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const eventsForDate = (d: Date) => events.filter(e => e.date === toDateStr(d));
  const eventsForDay = (day: number) => {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === d);
  };

  const greeting = () => {
    const h = today.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Week view
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const weekEnd = weekDays[6];
  const selectedEvents = eventsForDate(selectedDate).filter(e => !e.isHoliday);
  const selectedHolidays = eventsForDate(selectedDate).filter(e => e.isHoliday);

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };

  // Month view
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthCells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (monthCells.length % 7 !== 0) monthCells.push(null);

  const prevMonth = () => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1);

  const isToday = (d: Date) => toDateStr(d) === toDateStr(today);
  const isSame = (d: Date) => toDateStr(d) === toDateStr(selectedDate);

  return (
    <View style={styles.container}>
      <WebPage>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={isWeb ? styles.webScroll : undefined}>
        {/* Header */}
        <View style={[styles.header, isWeb && styles.headerWeb]}>
          <View>
            <Text style={[styles.greeting, isWeb && styles.greetingWeb]}>{greeting()}, Rafay</Text>
            <Text style={[styles.todayLabel, isWeb && styles.todayLabelWeb]}>{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, isWeb && styles.addBtnWeb]} onPress={() => router.push('/new-event')}>
            <Ionicons name="add" size={24} color={Colors.background} />
          </TouchableOpacity>
        </View>

        {/* View toggle */}
        <View style={[styles.toggleRow, isWeb && styles.toggleRowWeb]}>
          <TouchableOpacity style={[styles.toggle, view === 'week' && styles.toggleActive]} onPress={() => setView('week')}>
            <Text style={[styles.toggleText, view === 'week' && styles.toggleTextActive]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggle, view === 'month' && styles.toggleActive]} onPress={() => setView('month')}>
            <Text style={[styles.toggleText, view === 'month' && styles.toggleTextActive]}>Month</Text>
          </TouchableOpacity>
        </View>

        {view === 'week' ? (
          <>
            {/* Week nav */}
            <View style={[styles.weekNav, isWeb && styles.weekNavWeb]}>
              <TouchableOpacity onPress={prevWeek} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={20} color={Colors.text} />
              </TouchableOpacity>
              <Text style={[styles.weekLabel, isWeb && styles.weekLabelWeb]}>
                {SHORT_MONTHS[weekStart.getMonth()]} {weekStart.getDate()} – {SHORT_MONTHS[weekEnd.getMonth()]} {weekEnd.getDate()}
              </Text>
              <TouchableOpacity onPress={nextWeek} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Day pills — full-width row on web */}
            {isWeb ? (
              <View style={styles.dayPillsRowWeb}>
                {weekDays.map((d, i) => {
                  const active = isSame(d);
                  const todayDay = isToday(d);
                  const hasEvents = eventsForDate(d).some(e => !e.isHoliday);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.dayPill, styles.dayPillWeb, active && styles.dayPillActive]}
                      onPress={() => setSelectedDate(new Date(d))}
                    >
                      <Text style={[styles.pillDayName, styles.pillDayNameWeb, active && styles.pillTextActive]}>{DAY_FULL[d.getDay()]}</Text>
                      <Text style={[styles.pillDate, styles.pillDateWeb, active && styles.pillTextActive, todayDay && !active && styles.todayPillDate]}>{d.getDate()}</Text>
                      {hasEvents ? <View style={[styles.eventDot, styles.eventDotWeb, active && { backgroundColor: Colors.background }]} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPills}>
                {weekDays.map((d, i) => {
                  const active = isSame(d);
                  const todayDay = isToday(d);
                  const hasEvents = eventsForDate(d).some(e => !e.isHoliday);
                  return (
                    <TouchableOpacity key={i} style={[styles.dayPill, active && styles.dayPillActive]} onPress={() => setSelectedDate(new Date(d))}>
                      <Text style={[styles.pillDayName, active && styles.pillTextActive]}>{DAY_FULL[d.getDay()]}</Text>
                      <Text style={[styles.pillDate, active && styles.pillTextActive, todayDay && !active && styles.todayPillDate]}>{d.getDate()}</Text>
                      {hasEvents ? <View style={[styles.eventDot, active && { backgroundColor: Colors.background }]} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Selected day events */}
            <View style={[styles.section, isWeb && styles.sectionWeb]}>
              <Text style={[styles.sectionTitle, isWeb && styles.sectionTitleWeb]}>
                {DAY_FULL[selectedDate.getDay()]}, {SHORT_MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
              </Text>
              {selectedHolidays.map(e => (
                <View key={e.id} style={styles.holidayBanner}>
                  <View style={styles.holidayDot} />
                  <Text style={styles.holidayText}>{e.title}</Text>
                </View>
              ))}
              {selectedEvents.length === 0 && selectedHolidays.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyDayText}>No events</Text>
                  <TouchableOpacity onPress={() => router.push('/new-event')}>
                    <Text style={styles.emptyDayAdd}>+ Add one</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                selectedEvents.map(e => <EventCard key={e.id} event={e} />)
              )}
            </View>
          </>
        ) : (
          <>
            {/* Month nav */}
            <View style={[styles.weekNav, isWeb && styles.weekNavWeb]}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={20} color={Colors.text} />
              </TouchableOpacity>
              <Text style={[styles.weekLabel, isWeb && styles.weekLabelWeb]}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={isWeb ? styles.webMonthWrap : undefined}>
            {/* Day headers */}
            <View style={[styles.dayRow, isWeb && styles.webDayRow]}>
              {DAY_NAMES.map(d => (
                <Text key={d} style={[styles.dayName, isWeb && styles.dayNameWeb]}>{d}</Text>
              ))}
            </View>

            {/* Grid */}
            <View style={[styles.grid, isWeb && styles.webGrid]}>
              {monthCells.map((day, i) => {
                if (!day) return <View key={`e${i}`} style={[styles.cell, isWeb && styles.cellWeb]} />;
                const dayEvts = eventsForDay(day);
                const todayCell = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const hasHoliday = dayEvts.some(e => e.isHoliday);
                const hasEvent = dayEvts.some(e => !e.isHoliday);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.cell, isWeb && styles.cellWeb]}
                    onPress={() => {
                      setModalDay(day);
                      if (dayEvts.length) setModalVisible(true);
                    }}
                  >
                    <View style={[styles.dayCircle, isWeb && styles.dayCircleWeb, todayCell && styles.todayCircle]}>
                      <Text style={[styles.dayNum, isWeb && styles.dayNumWeb, todayCell && styles.todayNum]}>{day}</Text>
                    </View>
                    <View style={[styles.dots, isWeb && styles.dotsWeb]}>
                      {hasHoliday ? <View style={[styles.dot, isWeb && styles.dotWeb, { backgroundColor: Colors.holiday }]} /> : null}
                      {hasEvent ? <View style={[styles.dot, isWeb && styles.dotWeb, { backgroundColor: Colors.event }]} /> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            </View>
          </>
        )}

      </ScrollView>
      </WebPage>

      {/* Month view modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.overlay} onPress={() => setModalVisible(false)} />
          <View style={isWeb ? styles.webModalWrap : styles.modalWrapMobile} pointerEvents="box-none">
            <View style={[styles.sheet, isWeb && styles.webSheet]}>
              {!isWeb ? <View style={styles.sheetHandle} /> : null}
              <Text style={[styles.sheetTitle, isWeb && styles.sheetTitleWeb]}>
                {SHORT_MONTHS[month]} {modalDay}, {year}
              </Text>
              <FlatList
                data={modalDay ? eventsForDay(modalDay) : []}
                keyExtractor={e => e.id}
                style={isWeb ? styles.sheetListWeb : undefined}
                contentContainerStyle={[styles.sheetList, isWeb && styles.sheetListWebContent]}
                renderItem={({ item }) => <EventCard event={item} variant="modal" />}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  webScroll: { paddingBottom: 40, paddingTop: 8 },
  headerWeb: { paddingHorizontal: 0, paddingTop: 12 },
  greetingWeb: { fontSize: 30, letterSpacing: -0.5 },
  todayLabelWeb: { fontSize: 15, marginTop: 4 },
  toggleRowWeb: { marginHorizontal: 0, maxWidth: 400 },
  weekNavWeb: { paddingHorizontal: 0 },
  weekLabelWeb: { fontSize: 18 },
  dayPillsRowWeb: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    paddingVertical: 10,
  },
  dayPillWeb: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderRadius: 18,
  },
  pillDayNameWeb: { fontSize: 12 },
  pillDateWeb: { fontSize: 22 },
  eventDotWeb: { width: 6, height: 6, borderRadius: 3 },
  sectionWeb: { paddingHorizontal: 0, paddingTop: 28, width: '100%' },
  sectionTitleWeb: { fontSize: 22, marginBottom: 16 },
  webMonthWrap: { width: '100%', paddingHorizontal: 0, marginTop: 4 },
  webDayRow: { width: '100%', paddingHorizontal: 0, marginBottom: 4 },
  webGrid: { width: '100%', paddingHorizontal: 0 },
  dayNameWeb: { fontSize: 14, fontWeight: '600', paddingBottom: 12, color: Colors.textMuted },
  cellWeb: { paddingVertical: 14, minHeight: 72 },
  dayCircleWeb: { width: 48, height: 48, borderRadius: 24 },
  dayNumWeb: { fontSize: 17, fontWeight: '500' },
  dotsWeb: { marginTop: 6, height: 8, gap: 4 },
  dotWeb: { width: 5, height: 5, borderRadius: 3 },
  modalRoot: { flex: 1 },
  modalWrapMobile: { flex: 1, justifyContent: 'flex-end' },
  webModalWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  webSheet: {
    width: '92%',
    maxWidth: 920,
    minHeight: 320,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    padding: 32,
    paddingTop: 28,
  },
  sheetTitleWeb: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 24,
    letterSpacing: -0.3,
  },
  sheetListWeb: { flexGrow: 0 },
  sheetListWebContent: { paddingBottom: 12, gap: 16 },
  sheetList: { paddingBottom: 8, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  addBtnWeb: { width: 48, height: 48, borderRadius: 24 },
  greeting: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  todayLabel: { color: Colors.subtext, fontSize: 13, marginTop: 2 },
  addBtn: { ...primaryButton, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 12, backgroundColor: Colors.surface, borderRadius: 10, padding: 3 },
  toggle: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: Colors.card },
  toggleText: { color: Colors.subtext, fontSize: 14, fontWeight: '500' },
  toggleTextActive: { color: Colors.text, fontWeight: '600' },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  navBtn: { padding: 8 },
  weekLabel: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  dayPills: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  dayPill: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: Colors.card, gap: 4, minWidth: 56 },
  dayPillActive: { backgroundColor: Colors.text },
  pillDayName: { color: Colors.subtext, fontSize: 11, fontWeight: '500' },
  pillDate: { color: Colors.text, fontSize: 18, fontWeight: '600' },
  pillTextActive: { color: Colors.background },
  todayPillDate: { color: Colors.event },
  eventDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.event },
  section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  holidayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  holidayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.holiday },
  holidayText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600', flex: 1 },
  emptyDay: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyDayText: { color: Colors.subtext, fontSize: 16 },
  emptyDayAdd: { color: Colors.event, fontSize: 14, fontWeight: '600' },
  dayRow: { flexDirection: 'row', paddingHorizontal: 8 },
  dayName: { flex: 1, textAlign: 'center', color: Colors.subtext, fontSize: 12, fontWeight: '500', paddingBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  cell: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  dayCircle: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  todayCircle: { backgroundColor: Colors.text },
  dayNum: { color: Colors.text, fontSize: 15 },
  todayNum: { color: Colors.background, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 3, marginTop: 2, height: 6 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '60%',
    ...Platform.select({ web: { borderTopLeftRadius: 16, borderTopRightRadius: 16 }, default: {} }),
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { color: Colors.text, fontSize: 18, fontWeight: '600', marginBottom: 16 },
});

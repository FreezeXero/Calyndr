import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { generateId, saveEvent } from '@/lib/storage';
import { CalEvent, EntryType } from '@/types';
import { scheduleEventReminder } from '@/lib/notifications';
import WebPage from '@/components/WebPage';
import { isWeb } from '@/constants/layout';

const TYPE_OPTIONS: { key: EntryType; label: string }[] = [
  { key: 'event', label: 'Event' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'appointment', label: 'Appointment' },
];

export default function NewEventScreen() {
  const router = useRouter();
  const [entryType, setEntryType] = useState<EntryType>('event');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [person, setPerson] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a title.');
      return;
    }
    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format.');
      return;
    }
    if (!startTime.trim() || !/^\d{1,2}:\d{2}$/.test(startTime.trim())) {
      Alert.alert('Invalid start time', 'Use HH:MM (24h) format.');
      return;
    }

    let end = endTime.trim();
    if (entryType === 'reminder') {
      end = startTime.trim();
    } else if (!end || !/^\d{1,2}:\d{2}$/.test(end)) {
      Alert.alert('Invalid end time', 'Use HH:MM (24h) format.');
      return;
    }

    const id = generateId();
    const event: CalEvent = {
      id,
      type: entryType,
      title: title.trim(),
      date: date.trim(),
      startTime: startTime.trim(),
      endTime: end,
      isHoliday: false,
    };

    if (entryType === 'event' || entryType === 'appointment') {
      if (location.trim()) event.location = location.trim();
      if (entryType === 'event' && description.trim()) event.description = description.trim();
      if (entryType === 'appointment' && person.trim()) event.person = person.trim();
    }

    await saveEvent(event);

    if (entryType === 'event' || entryType === 'appointment') {
      await scheduleEventReminder({
        id: event.id,
        title: event.title,
        date: event.date,
        startTime: event.startTime,
      });
    }

    router.back();
  };

  const showLocation = entryType === 'event' || entryType === 'appointment';
  const showDescription = entryType === 'event';
  const showPerson = entryType === 'appointment';
  const showEndTime = entryType !== 'reminder';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <WebPage variant="detail" contentStyle={isWeb ? styles.webPad : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.typeChip, entryType === opt.key && styles.typeChipActive]}
              onPress={() => setEntryType(opt.key)}
            >
              <Text style={[styles.typeChipText, entryType === opt.key && styles.typeChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="What's happening?"
          placeholderTextColor={Colors.subtext}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2025-03-15"
          placeholderTextColor={Colors.subtext}
          value={date}
          onChangeText={setDate}
        />

        <Text style={styles.label}>Start time (HH:MM)</Text>
        <TextInput
          style={styles.input}
          placeholder="14:00"
          placeholderTextColor={Colors.subtext}
          value={startTime}
          onChangeText={setStartTime}
        />

        {showEndTime ? (
          <>
            <Text style={styles.label}>End time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="15:30"
              placeholderTextColor={Colors.subtext}
              value={endTime}
              onChangeText={setEndTime}
            />
          </>
        ) : null}

        {showLocation ? (
          <>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              placeholderTextColor={Colors.subtext}
              value={location}
              onChangeText={setLocation}
            />
          </>
        ) : null}

        {showPerson ? (
          <>
            <Text style={styles.label}>Person / Contact</Text>
            <TextInput
              style={styles.input}
              placeholder="Who is this with?"
              placeholderTextColor={Colors.subtext}
              value={person}
              onChangeText={setPerson}
            />
          </>
        ) : null}

        {showDescription ? (
          <>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Optional details"
              placeholderTextColor={Colors.subtext}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </>
        ) : null}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={22} color={Colors.background} />
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
      </WebPage>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  webPad: { paddingHorizontal: 24, paddingVertical: 16 },
  content: { padding: 20, paddingBottom: 40 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeChipActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  typeChipText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' },
  typeChipTextActive: { color: Colors.background },
  label: { color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.text,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  saveText: { color: Colors.background, fontSize: 17, fontWeight: '700' },
});

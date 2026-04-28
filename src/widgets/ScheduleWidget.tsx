'use no memo';

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import type { ColorProp } from 'react-native-android-widget/lib/typescript/widgets/utils/style.props';
import type { ImageWidgetSource } from 'react-native-android-widget/lib/typescript/widgets/ImageWidget';

import type { WidgetSnapshot, WidgetLesson, WidgetDayBlock } from '@services/widget/widgetData';

/** Cast a hex string to the ColorProp template literal type. */
const c = (hex: string): ColorProp => hex as ColorProp;
/** Cast a URL string to ImageWidgetSource. */
const img = (url: string): ImageWidgetSource => url as ImageWidgetSource;

// ─── Helpers ─────────────────────────────────────────────────

const dayNamesShort = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
const monthNames = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDayLabel(block: WidgetDayBlock): string {
  const dow = dayNamesShort[block.dayOfWeek] ?? '';
  const month = monthNames[block.month] ?? '';
  return `${dow}, ${block.dayOfMonth} ${month}`;
}

function minutesFromTime(time: string): number {
  const parts = time.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  return h * 60 + m;
}

function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function remainingLessons(lessons: WidgetLesson[], afterMinutes: number): WidgetLesson[] {
  return lessons.filter((l) => minutesFromTime(l.endTime) > afterMinutes);
}

function resolveDisplay(snapshot: WidgetSnapshot): {
  lessons: WidgetLesson[];
  isNextDay: boolean;
  displayBlock: WidgetDayBlock | null;
} {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayISO = `${y}-${mo}-${d}`;
  const mins = nowMinutes();

  if (snapshot.today.dateISO === todayISO) {
    const remaining = remainingLessons(snapshot.today.lessons, mins);
    if (remaining.length > 0) {
      return { lessons: remaining, isNextDay: false, displayBlock: snapshot.today };
    }
    return {
      lessons: snapshot.nextDay?.lessons ?? [],
      isNextDay: snapshot.nextDay != null,
      displayBlock: snapshot.nextDay ?? snapshot.today,
    };
  }

  if (snapshot.nextDay && snapshot.nextDay.dateISO === todayISO) {
    const remaining = remainingLessons(snapshot.nextDay.lessons, mins);
    return {
      lessons: remaining.length > 0 ? remaining : snapshot.nextDay.lessons,
      isNextDay: false,
      displayBlock: snapshot.nextDay,
    };
  }

  return {
    lessons: snapshot.nextDay?.lessons ?? snapshot.today.lessons,
    isNextDay: snapshot.nextDay != null,
    displayBlock: snapshot.nextDay ?? snapshot.today,
  };
}

// ─── Colors ──────────────────────────────────────────────────

const BG_COLOR = '#FFFFFF';
const TEXT_PRIMARY = '#000000';
const TEXT_SECONDARY = '#8E8E93';
const ORANGE = '#FF9500';
const FULL = 'match_parent' as const;

// ─── Lesson Row ──────────────────────────────────────────────

interface LessonRowProps {
  lesson: WidgetLesson;
  compact?: boolean;
  showNote?: boolean;
  showPhoto?: boolean;
}

function LessonRow({ lesson, compact = false, showNote = false, showPhoto = false }: LessonRowProps) {
  if (!lesson.isMine) {
    return (
      <FlexWidget
        style={{
          width: FULL,
          flexDirection: 'column',
          paddingVertical: 3,
          paddingHorizontal: 6,
          borderColor: c(lesson.typeColorHex + '80'),
          borderWidth: 1,
          borderRadius: 6,
          borderStyle: 'dashed',
        }}
      >
        <FlexWidget style={{ width: FULL, flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text={lesson.subject}
            style={{ fontSize: 11, fontWeight: '500', color: TEXT_SECONDARY }}
            maxLines={1}
          />
          {(lesson.numSubgroup === 1 || lesson.numSubgroup === 2) ? (
            <TextWidget
              text={` ${lesson.numSubgroup} п/г`}
              style={{ fontSize: 9, fontWeight: '500', color: c(lesson.typeColorHex) }}
            />
          ) : null}
        </FlexWidget>
        <TextWidget
          text={`${lesson.startTime}–${lesson.endTime}`}
          style={{ fontSize: 10, color: TEXT_SECONDARY }}
        />
      </FlexWidget>
    );
  }

  const auditoryText = lesson.auditories.length > 0
    ? ` · ${lesson.auditories.join(', ')}`
    : '';

  return (
    <FlexWidget style={{ width: FULL, height: FULL, flexDirection: 'row', alignItems: 'center' }}>
      {/* Color bar — stretches full height */}
      <FlexWidget
        style={{
          width: 4,
          height: FULL,
          backgroundColor: c(lesson.typeColorHex),
          borderRadius: 2,
          marginRight: 6,
        }}
      />

      {/* Content — takes remaining width, centered vertically */}
      <FlexWidget style={{ width: 0, flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <FlexWidget style={{ width: FULL, flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text={lesson.subject}
            style={{ fontSize: compact ? 12 : 13, fontWeight: '600', color: TEXT_PRIMARY }}
            maxLines={1}
          />
          {(lesson.numSubgroup === 1 || lesson.numSubgroup === 2) ? (
            <TextWidget
              text={` ${lesson.numSubgroup} п/г`}
              style={{ fontSize: compact ? 9 : 10, fontWeight: '500', color: c(lesson.typeColorHex) }}
            />
          ) : null}
        </FlexWidget>

        <TextWidget
          text={`${lesson.startTime}–${lesson.endTime}${auditoryText}`}
          style={{ fontSize: compact ? 10 : 11, color: TEXT_SECONDARY }}
          maxLines={1}
        />

        {showNote && lesson.note ? (
          <TextWidget
            text={lesson.note}
            style={{ fontSize: 10, color: TEXT_SECONDARY, fontStyle: 'italic' }}
            maxLines={1}
          />
        ) : null}
      </FlexWidget>

      {/* Photo — always right-aligned */}
      {showPhoto && lesson.teacherPhotoUrl ? (
        <ImageWidget
          image={img(lesson.teacherPhotoUrl)}
          imageWidth={28}
          imageHeight={28}
          radius={14}
          style={{ marginLeft: 6 }}
        />
      ) : null}
    </FlexWidget>
  );
}

// ─── Empty state ─────────────────────────────────────────────

interface EmptyStateProps {
  allDone?: boolean;
  holidayName?: string | null;
  displayBlock?: WidgetDayBlock | null;
  strings: { noClasses: string; allDone: string };
}

function EmptyState({ allDone = false, holidayName, displayBlock, strings }: EmptyStateProps) {
  if (holidayName) {
    return (
      <FlexWidget style={{ width: FULL, height: FULL, justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget text="⭐" style={{ fontSize: 24 }} />
        <TextWidget
          text={holidayName}
          style={{ fontSize: 12, fontWeight: '500', color: TEXT_PRIMARY, textAlign: 'center' }}
        />
        {displayBlock ? (
          <TextWidget
            text={formatDayLabel(displayBlock)}
            style={{ fontSize: 11, color: TEXT_SECONDARY }}
          />
        ) : null}
      </FlexWidget>
    );
  }

  return (
    <FlexWidget style={{ width: FULL, height: FULL, justifyContent: 'center', alignItems: 'center' }}>
      <TextWidget
        text={allDone ? '✓' : '📅'}
        style={{ fontSize: 24 }}
      />
      <TextWidget
        text={allDone ? strings.allDone : strings.noClasses}
        style={{ fontSize: 12, color: TEXT_SECONDARY, textAlign: 'center' }}
      />
    </FlexWidget>
  );
}

// ─── Header ──────────────────────────────────────────────────

interface HeaderProps {
  groupName: string;
  currentWeek: number;
  dateLabel?: string;
  showWeek?: boolean;
  strings: { weekLabel: string };
}

function WidgetHeader({ groupName, currentWeek, dateLabel, showWeek = true, strings }: HeaderProps) {
  return (
    <FlexWidget style={{ width: FULL, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget
          text={groupName}
          style={{ fontSize: 11, color: TEXT_SECONDARY }}
        />
        {dateLabel ? (
          <TextWidget
            text={`  ${dateLabel}`}
            style={{ fontSize: 10, fontWeight: '500', color: ORANGE }}
          />
        ) : null}
      </FlexWidget>
      {showWeek ? (
        <TextWidget
          text={`${strings.weekLabel} ${currentWeek}`}
          style={{ fontSize: 11, color: TEXT_SECONDARY }}
        />
      ) : null}
    </FlexWidget>
  );
}

// ─── Divider ─────────────────────────────────────────────────

function Divider() {
  return (
    <FlexWidget
      style={{
        width: FULL,
        height: 0.5,
        backgroundColor: '#C6C6C8',
        marginVertical: 3,
      }}
    />
  );
}

// ─── Widget sizes ────────────────────────────────────────────

export type WidgetSize = 'small' | 'medium' | 'large';

interface ScheduleWidgetProps {
  snapshot: WidgetSnapshot | null;
  size: WidgetSize;
}

export function ScheduleWidget({ snapshot, size }: ScheduleWidgetProps) {
  if (!snapshot) {
    return (
      <FlexWidget
        style={{ width: FULL, height: FULL, padding: 12, backgroundColor: BG_COLOR, borderRadius: 16 }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'bsuirtime://' }}
      >
        <EmptyState strings={{ noClasses: 'Нет данных', allDone: '' }} />
      </FlexWidget>
    );
  }

  const { lessons, isNextDay, displayBlock } = resolveDisplay(snapshot);
  const strings = snapshot.strings;
  const holiday = displayBlock?.holidayName;

  const maxLessons = size === 'large' ? 7 : 3;
  const showPhoto = size !== 'small';
  const showNote = size === 'large';
  const compact = size === 'small';

  return (
    <FlexWidget
      style={{
        width: FULL,
        height: FULL,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: 12,
        backgroundColor: BG_COLOR,
        borderRadius: 16,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'bsuirtime://' }}
    >
      {/* Header */}
      {size === 'small' ? (
        <FlexWidget style={{ width: FULL, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <TextWidget
            text={snapshot.groupName}
            style={{ fontSize: 11, color: TEXT_SECONDARY }}
          />
          {isNextDay && displayBlock ? (
            <TextWidget
              text={formatDayLabel(displayBlock)}
              style={{ fontSize: 10, fontWeight: '500', color: ORANGE }}
            />
          ) : null}
        </FlexWidget>
      ) : (
        <WidgetHeader
          groupName={snapshot.groupName}
          currentWeek={snapshot.currentWeek}
          dateLabel={isNextDay && displayBlock ? formatDayLabel(displayBlock) : undefined}
          strings={strings}
        />
      )}

      {/* Content */}
      {holiday ? (
        <EmptyState
          holidayName={holiday}
          displayBlock={displayBlock}
          strings={strings}
        />
      ) : lessons.length > 0 ? (
        <FlexWidget style={{ width: FULL, height: 0, flex: 1, flexDirection: 'column' }}>
          {lessons.slice(0, maxLessons).map((lesson, idx) => (
            <FlexWidget key={`l${idx}`} style={{ width: FULL, flex: 1, flexDirection: 'column', marginTop: size !== 'large' && idx > 0 ? 4 : 0 }}>
              {size === 'large' && idx > 0 ? <Divider /> : null}
              <LessonRow
                lesson={lesson}
                compact={compact}
                showNote={showNote}
                showPhoto={showPhoto}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : (
        <EmptyState
          allDone={snapshot.today.lessons.length > 0}
          strings={strings}
        />
      )}
    </FlexWidget>
  );
}

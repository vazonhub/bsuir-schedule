'use no memo';

import React from 'react';
import { FlexWidget, ListWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
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
const BLUE = '#0A84FF';
const RED = '#FF3B30';
const ORANGE = '#FF9500';
const SEPARATOR = '#E5E5EA';
const FULL = 'match_parent' as const;

/** Returns color for date label: today=blue, tomorrow=red, future=orange. */
function getDayColor(dateISO: string, todayISO: string): string {
  if (dateISO === todayISO) return BLUE;
  const [yStr, mStr, dStr] = todayISO.split('-');
  const y = parseInt(yStr ?? '0', 10);
  const m = parseInt(mStr ?? '1', 10) - 1;
  const d = parseInt(dStr ?? '1', 10);
  const tomorrow = new Date(y, m, d + 1);
  const tY = tomorrow.getFullYear();
  const tM = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tD = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowISO = `${tY}-${tM}-${tD}`;
  if (dateISO === tomorrowISO) return RED;
  return ORANGE;
}

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

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
          paddingVertical: 4,
          paddingHorizontal: 8,
          borderColor: c(lesson.typeColorHex + '80'),
          borderWidth: 1,
          borderRadius: 8,
          borderStyle: 'dashed',
        }}
      >
        <FlexWidget style={{ width: FULL, flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text={lesson.subject}
            style={{ fontSize: 12, fontWeight: '500', color: TEXT_SECONDARY }}
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
    <FlexWidget style={{ width: FULL, flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
      {/* Color bar */}
      <FlexWidget
        style={{
          width: 4,
          height: FULL,
          backgroundColor: c(lesson.typeColorHex),
          borderRadius: 2,
          marginRight: 8,
        }}
      />

      {/* Content */}
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

      {/* Photo(s) or group circles — right-aligned */}
      {showPhoto && lesson.teacherPhotos.length > 0 ? (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
          {lesson.teacherPhotos.length > 2 ? (
            <FlexWidget
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#E5E5EA',
                borderWidth: 1,
                borderColor: c(BG_COLOR),
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <TextWidget
                text={`${lesson.teacherPhotos.length - 2}+`}
                style={{ fontSize: 10, fontWeight: '700', color: TEXT_SECONDARY }}
              />
            </FlexWidget>
          ) : null}
          {[...lesson.teacherPhotos.slice(0, 2)].reverse().map((url, i) => (
            <FlexWidget
              key={`ph${i}`}
              style={{
                marginLeft: (i === 0 && lesson.teacherPhotos.length <= 2) ? 0 : -10,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: c(BG_COLOR),
              }}
            >
              <ImageWidget
                image={img(url)}
                imageWidth={28}
                imageHeight={28}
                radius={14}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : showPhoto && lesson.studentGroups.length > 0 ? (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
          {lesson.studentGroups.length > 2 ? (
            <FlexWidget
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#E5E5EA',
                borderWidth: 1,
                borderColor: c(BG_COLOR),
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <TextWidget
                text={`${lesson.studentGroups.length - 2}+`}
                style={{ fontSize: 10, fontWeight: '700', color: TEXT_SECONDARY }}
              />
            </FlexWidget>
          ) : null}
          {[...lesson.studentGroups.slice(0, 2)].reverse().map((name, i) => (
            <FlexWidget
              key={`gr${i}`}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: '#E5E5EA',
                borderWidth: 1,
                borderColor: c(BG_COLOR),
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: (i === 0 && lesson.studentGroups.length <= 2) ? 0 : -10,
              }}
            >
              <TextWidget
                text={name}
                style={{ fontSize: 7, fontWeight: '700', color: TEXT_SECONDARY }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
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

// ─── Separator ──────────────────────────────────────────────

function Separator() {
  return (
    <FlexWidget
      style={{
        width: FULL,
        height: 0.5,
        backgroundColor: c(SEPARATOR),
        marginVertical: 2,
      }}
    />
  );
}

// ─── Header ──────────────────────────────────────────────────

interface HeaderProps {
  groupName: string;
  currentWeek: number;
  dateLabel?: string;
  dateLabelColor?: string;
  showWeek?: boolean;
  showRefresh?: boolean;
  strings: { weekLabel: string };
}

function WidgetHeader({ groupName, currentWeek, dateLabel, dateLabelColor = ORANGE, showWeek = true, showRefresh = false, strings }: HeaderProps) {
  return (
    <FlexWidget style={{ width: FULL, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1, width: 0 }}>
        <TextWidget
          text={groupName}
          style={{ fontSize: 12, fontWeight: '600', color: TEXT_PRIMARY }}
        />
        {dateLabel ? (
          <TextWidget
            text={`  ${dateLabel}`}
            style={{ fontSize: 11, fontWeight: '500', color: c(dateLabelColor) }}
          />
        ) : null}
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        {showWeek ? (
          <TextWidget
            text={`${strings.weekLabel} ${currentWeek}`}
            style={{ fontSize: 11, color: TEXT_SECONDARY }}
          />
        ) : null}
        {showRefresh ? (
          <FlexWidget
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: 6,
            }}
            clickAction="REFRESH"
          >
            <TextWidget
              text="↻"
              style={{ fontSize: 16, fontWeight: '600', color: c(BLUE) }}
            />
          </FlexWidget>
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}

// ─── Widget ─────────────────────────────────────────────────

export type WidgetSize = 'small' | 'medium' | 'large';

interface ScheduleWidgetProps {
  snapshot: WidgetSnapshot | null;
  size: WidgetSize;
  /** Widget height in dp, used for dynamic lesson count. */
  widgetHeight?: number;
}

export function ScheduleWidget({ snapshot, size, widgetHeight }: ScheduleWidgetProps) {
  if (!snapshot) {
    return (
      <FlexWidget
        style={{ width: FULL, height: FULL, padding: 14, backgroundColor: BG_COLOR, borderRadius: 20 }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'bsuirtime://' }}
      >
        <EmptyState strings={{ noClasses: 'Нет данных', allDone: '' }} />
      </FlexWidget>
    );
  }

  const { lessons, displayBlock } = resolveDisplay(snapshot);
  const strings = snapshot.strings;
  const holiday = displayBlock?.holidayName;
  const todayISO = getTodayISO();

  // Dynamic lesson count based on widget height
  // Each lesson row ~48dp, header ~32dp, padding ~28dp
  const dynamicMax = widgetHeight ? Math.max(1, Math.floor((widgetHeight - 60) / 48)) : undefined;
  const defaultMax = size === 'large' ? 7 : size === 'medium' ? 3 : 2;
  const maxLessons = dynamicMax ?? defaultMax;

  const showPhoto = size !== 'small';
  const showNote = size === 'large' || (dynamicMax !== undefined && dynamicMax >= 5);
  const compact = size === 'small' && !dynamicMax;
  const showRefresh = size !== 'small';

  const dateLabelText = displayBlock ? formatDayLabel(displayBlock) : undefined;
  const dateLabelColor = displayBlock ? getDayColor(displayBlock.dateISO, todayISO) : ORANGE;

  const visibleLessons = lessons.slice(0, maxLessons);

  return (
    <FlexWidget
      style={{
        width: FULL,
        height: FULL,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: 14,
        backgroundColor: BG_COLOR,
        borderRadius: 20,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'bsuirtime://' }}
    >
      {/* Header */}
      {size === 'small' && !dynamicMax ? (
        <FlexWidget style={{ width: FULL, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <TextWidget
            text={snapshot.groupName}
            style={{ fontSize: 12, fontWeight: '600', color: TEXT_PRIMARY }}
          />
          {dateLabelText ? (
            <TextWidget
              text={dateLabelText}
              style={{ fontSize: 10, fontWeight: '500', color: c(dateLabelColor) }}
            />
          ) : null}
        </FlexWidget>
      ) : (
        <WidgetHeader
          groupName={snapshot.groupName}
          currentWeek={snapshot.currentWeek}
          dateLabel={dateLabelText}
          dateLabelColor={dateLabelColor}
          showRefresh={showRefresh}
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
      ) : visibleLessons.length > 0 ? (
        <ListWidget style={{ width: FULL, height: FULL }}>
          {visibleLessons.map((lesson, idx) => (
            <FlexWidget key={`l${idx}`} style={{ width: FULL, flexDirection: 'column' }}>
              {idx > 0 ? <Separator /> : null}
              <LessonRow
                lesson={lesson}
                compact={compact}
                showNote={showNote}
                showPhoto={showPhoto}
              />
            </FlexWidget>
          ))}
        </ListWidget>
      ) : (
        <EmptyState
          allDone={snapshot.today.lessons.length > 0}
          strings={strings}
        />
      )}
    </FlexWidget>
  );
}

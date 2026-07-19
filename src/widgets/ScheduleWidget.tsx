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
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
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

/** Theme-aware palette so the widget matches the app's light/dark scheme. */
interface WidgetPalette {
  bg: string;
  textPrimary: string;
  textSecondary: string;
  separator: string;
  /** Placeholder background for avatar / group circles. */
  avatarBg: string;
}

const LIGHT_PALETTE: WidgetPalette = {
  bg: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  separator: '#E5E5EA',
  avatarBg: '#E5E5EA',
};

const DARK_PALETTE: WidgetPalette = {
  bg: '#1C1C1E',
  textPrimary: '#FFFFFF',
  textSecondary: '#98989F',
  separator: '#38383A',
  avatarBg: '#3A3A3C',
};

function getPalette(theme: 'light' | 'dark' | undefined): WidgetPalette {
  return theme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}

const BLUE = '#0A84FF';
const RED = '#FF3B30';
const ORANGE = '#FF9500';
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
  pal: WidgetPalette;
  compact?: boolean;
  showNote?: boolean;
  showPhoto?: boolean;
}

function LessonRow({
  lesson,
  pal,
  compact = false,
  showNote = false,
  showPhoto = false,
}: LessonRowProps) {
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
            style={{ fontSize: 12, fontWeight: '500', color: c(pal.textSecondary) }}
            maxLines={1}
          />
          {lesson.numSubgroup === 1 || lesson.numSubgroup === 2 ? (
            <TextWidget
              text={` ${lesson.numSubgroup} п/г`}
              style={{ fontSize: 9, fontWeight: '500', color: c(lesson.typeColorHex) }}
            />
          ) : null}
        </FlexWidget>
        <TextWidget
          text={`${lesson.startTime}–${lesson.endTime}`}
          style={{ fontSize: 10, color: c(pal.textSecondary) }}
        />
      </FlexWidget>
    );
  }

  const auditoryText = lesson.auditories.length > 0 ? ` · ${lesson.auditories.join(', ')}` : '';

  return (
    <FlexWidget
      style={{ width: FULL, flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
    >
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
            style={{ fontSize: compact ? 12 : 13, fontWeight: '600', color: c(pal.textPrimary) }}
            maxLines={1}
          />
          {lesson.numSubgroup === 1 || lesson.numSubgroup === 2 ? (
            <TextWidget
              text={` ${lesson.numSubgroup} п/г`}
              style={{
                fontSize: compact ? 9 : 10,
                fontWeight: '500',
                color: c(lesson.typeColorHex),
              }}
            />
          ) : null}
        </FlexWidget>

        <TextWidget
          text={`${lesson.startTime}–${lesson.endTime}${auditoryText}`}
          style={{ fontSize: compact ? 10 : 11, color: c(pal.textSecondary) }}
          maxLines={1}
        />

        {showNote && lesson.note ? (
          <TextWidget
            text={lesson.note}
            style={{ fontSize: 10, color: c(pal.textSecondary), fontStyle: 'italic' }}
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
                backgroundColor: c(pal.avatarBg),
                borderWidth: 1,
                borderColor: c(pal.bg),
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <TextWidget
                text={`${lesson.teacherPhotos.length - 2}+`}
                style={{ fontSize: 10, fontWeight: '700', color: c(pal.textSecondary) }}
              />
            </FlexWidget>
          ) : null}
          {[...lesson.teacherPhotos.slice(0, 2)].reverse().map((url, i) => (
            <FlexWidget
              key={`ph${i}`}
              style={{
                marginLeft: i === 0 && lesson.teacherPhotos.length <= 2 ? 0 : -10,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: c(pal.bg),
              }}
            >
              <ImageWidget image={img(url)} imageWidth={28} imageHeight={28} radius={14} />
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
                backgroundColor: c(pal.avatarBg),
                borderWidth: 1,
                borderColor: c(pal.bg),
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <TextWidget
                text={`${lesson.studentGroups.length - 2}+`}
                style={{ fontSize: 10, fontWeight: '700', color: c(pal.textSecondary) }}
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
                backgroundColor: c(pal.avatarBg),
                borderWidth: 1,
                borderColor: c(pal.bg),
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: i === 0 && lesson.studentGroups.length <= 2 ? 0 : -10,
              }}
            >
              <TextWidget
                text={name}
                style={{ fontSize: 7, fontWeight: '700', color: c(pal.textSecondary) }}
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
  pal: WidgetPalette;
  allDone?: boolean;
  holidayName?: string | null;
  displayBlock?: WidgetDayBlock | null;
  strings: { noClasses: string; allDone: string };
}

function EmptyState({ pal, allDone = false, holidayName, displayBlock, strings }: EmptyStateProps) {
  if (holidayName) {
    return (
      <FlexWidget
        style={{ width: FULL, height: FULL, justifyContent: 'center', alignItems: 'center' }}
      >
        <TextWidget text="⭐" style={{ fontSize: 24 }} />
        <TextWidget
          text={holidayName}
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: c(pal.textPrimary),
            textAlign: 'center',
          }}
        />
        {displayBlock ? (
          <TextWidget
            text={formatDayLabel(displayBlock)}
            style={{ fontSize: 11, color: c(pal.textSecondary) }}
          />
        ) : null}
      </FlexWidget>
    );
  }

  return (
    <FlexWidget
      style={{ width: FULL, height: FULL, justifyContent: 'center', alignItems: 'center' }}
    >
      <TextWidget text={allDone ? '✓' : '📅'} style={{ fontSize: 24 }} />
      <TextWidget
        text={allDone ? strings.allDone : strings.noClasses}
        style={{ fontSize: 12, color: c(pal.textSecondary), textAlign: 'center' }}
      />
    </FlexWidget>
  );
}

// ─── Separator ──────────────────────────────────────────────

function Separator({ pal }: { pal: WidgetPalette }) {
  return (
    <FlexWidget
      style={{
        width: FULL,
        height: 0.5,
        backgroundColor: c(pal.separator),
        marginVertical: 2,
      }}
    />
  );
}

// ─── Header ──────────────────────────────────────────────────

interface HeaderProps {
  pal: WidgetPalette;
  groupName: string;
  currentWeek: number;
  dateLabel?: string;
  dateLabelColor?: string;
  showWeek?: boolean;
  showRefresh?: boolean;
  strings: { weekLabel: string };
}

function WidgetHeader({
  pal,
  groupName,
  currentWeek,
  dateLabel,
  dateLabelColor = ORANGE,
  showWeek = true,
  showRefresh = false,
  strings,
}: HeaderProps) {
  return (
    <FlexWidget
      style={{
        width: FULL,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1, width: 0 }}>
        <TextWidget
          text={groupName}
          style={{ fontSize: 12, fontWeight: '600', color: c(pal.textPrimary) }}
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
            style={{ fontSize: 11, color: c(pal.textSecondary) }}
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
            <TextWidget text="↻" style={{ fontSize: 16, fontWeight: '600', color: c(BLUE) }} />
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
    const pal = getPalette(undefined);
    return (
      <FlexWidget
        style={{
          width: FULL,
          height: FULL,
          padding: 14,
          backgroundColor: c(pal.bg),
          borderRadius: 20,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'bsuirtime://' }}
      >
        <EmptyState pal={pal} strings={{ noClasses: 'Нет данных', allDone: '' }} />
      </FlexWidget>
    );
  }

  const pal = getPalette(snapshot.theme);
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
        backgroundColor: c(pal.bg),
        borderRadius: 20,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'bsuirtime://' }}
    >
      {/* Header */}
      {size === 'small' && !dynamicMax ? (
        <FlexWidget
          style={{
            width: FULL,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <TextWidget
            text={snapshot.groupName}
            style={{ fontSize: 12, fontWeight: '600', color: c(pal.textPrimary) }}
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
          pal={pal}
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
        <EmptyState pal={pal} holidayName={holiday} displayBlock={displayBlock} strings={strings} />
      ) : visibleLessons.length > 0 ? (
        <ListWidget style={{ width: FULL, height: FULL }}>
          {visibleLessons.map((lesson, idx) => (
            <FlexWidget key={`l${idx}`} style={{ width: FULL, flexDirection: 'column' }}>
              {idx > 0 ? <Separator pal={pal} /> : null}
              <LessonRow
                lesson={lesson}
                pal={pal}
                compact={compact}
                showNote={showNote}
                showPhoto={showPhoto}
              />
            </FlexWidget>
          ))}
        </ListWidget>
      ) : (
        <EmptyState pal={pal} allDone={snapshot.today.lessons.length > 0} strings={strings} />
      )}
    </FlexWidget>
  );
}

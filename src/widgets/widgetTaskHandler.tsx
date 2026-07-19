'use no memo';

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import type { WidgetSnapshot } from '@services/widget/widgetData';

import { ScheduleWidget } from './ScheduleWidget';
import type { WidgetSize } from './ScheduleWidget';

const SNAPSHOT_KEY = 'android_widget_snapshot';

async function loadSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WidgetSnapshot;
  } catch {
    return null;
  }
}

function sizeFromName(name: string): WidgetSize {
  if (name.includes('Small')) return 'small';
  if (name.includes('Large')) return 'large';
  return 'medium';
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const snapshot = await loadSnapshot();
      const size = sizeFromName(widgetInfo.widgetName);
      renderWidget(
        <ScheduleWidget snapshot={snapshot} size={size} widgetHeight={widgetInfo.height} />,
      );
      break;
    }
    case 'WIDGET_DELETED':
      break;
    case 'WIDGET_CLICK': {
      // Handle refresh button click
      const snapshot = await loadSnapshot();
      const size = sizeFromName(widgetInfo.widgetName);
      renderWidget(
        <ScheduleWidget snapshot={snapshot} size={size} widgetHeight={widgetInfo.height} />,
      );
      break;
    }
  }
}

import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);

// Keep expo-router as the main app entry
import 'expo-router/entry';

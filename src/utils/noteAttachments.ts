import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

/**
 * Attachments for diary task notes.
 *
 * Picked images/files are copied into the app's document directory so the note
 * keeps working after the original (cache/temp) URI is gone, then referenced
 * from the markdown text as `![name](file://…)` / `[name](file://…)`.
 *
 * Requires the native `expo-image-picker` / `expo-document-picker` /
 * `expo-file-system` modules — available only in a dev/production build made
 * after `expo prebuild`, not in a stale client.
 */

const NOTES_DIR = `${FileSystem.documentDirectory ?? ''}diary-notes/`;

/** Make a filesystem-safe, collision-resistant file name. */
const uniqueName = (name: string): string => {
  const safe = name.replace(/[^\w.-]+/g, '_').slice(-64);
  return `${Date.now()}_${safe || 'file'}`;
};

const ensureDir = async (): Promise<void> => {
  const info = await FileSystem.getInfoAsync(NOTES_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(NOTES_DIR, { intermediates: true });
};

/** Copy a picked URI into the notes dir; returns the persisted `file://` path. */
const persist = async (from: string, name: string): Promise<string> => {
  await ensureDir();
  const to = NOTES_DIR + uniqueName(name);
  await FileSystem.copyAsync({ from, to });
  return to;
};

/**
 * Pick an image from the library and return a markdown image snippet
 * (`![name](file://…)`), or `null` if cancelled / permission denied.
 */
export const pickImageForNote = async (): Promise<string | null> => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
  const asset = res.canceled ? undefined : res.assets?.[0];
  if (!asset) return null;
  const ext = asset.uri.split('?')[0]?.split('.').pop() || 'jpg';
  const dest = await persist(asset.uri, asset.fileName ?? `image.${ext}`);
  return `![${asset.fileName ?? 'image'}](${dest})`;
};

/**
 * Pick an arbitrary file and return a markdown link snippet
 * (`[name](file://…)`), or `null` if cancelled.
 */
export const pickFileForNote = async (): Promise<string | null> => {
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  const asset = res.canceled ? undefined : res.assets?.[0];
  if (!asset) return null;
  const dest = await persist(asset.uri, asset.name);
  return `[${asset.name}](${dest})`;
};

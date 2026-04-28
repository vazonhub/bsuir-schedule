import { create } from 'zustand';

interface AppVersionState {
  latestVersion: string | null;
  releaseNotes: string | null;
  storeUrl: string | null;

  setVersionInfo(version: string, releaseNotes: string, storeUrl: string): void;
}

export const useAppVersionStore = create<AppVersionState>()((set) => ({
  latestVersion: null,
  releaseNotes: null,
  storeUrl: null,

  setVersionInfo: (version, releaseNotes, storeUrl) =>
    set({ latestVersion: version, releaseNotes, storeUrl }),
}));

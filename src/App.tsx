import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  connectYouTubeFromUi,
  getAuthChipText,
  getAuthPrimaryAction,
  getCompactAuthTone,
} from "./auth/client";
import {
  DEFAULT_YOUTUBE_AUTH_STATE,
  type YouTubeAuthState,
} from "./auth/schema";
import { subscribeToYouTubeAuthState } from "./auth/storage";
import { DEFAULT_FOCUS_SETTINGS } from "./settings/defaults";
import {
  createTemporaryDisableUntilIso,
  getTemporaryDisableUiState,
  TEMPORARY_DISABLE_PRESET_MINUTES,
  type TemporaryDisablePresetMinutes,
} from "./settings/temporary-disable";
import { patchFocusSettings, subscribeToFocusSettings } from "./settings/storage";
import { useTemporaryDisableNow } from "./settings/useTemporaryDisableNow";
import type { FocusSettings } from "./settings/schema";

function getAuthBadgeVariant(youtubeAuth: YouTubeAuthState) {
  if (youtubeAuth.connected) {
    return "success" as const;
  }

  if (youtubeAuth.uiState === "failed") {
    return "danger" as const;
  }

  if (
    youtubeAuth.uiState === "cancelled" ||
    youtubeAuth.uiState === "skipped"
  ) {
    return "warning" as const;
  }

  return "secondary" as const;
}

export default function App() {
  const [settings, setSettings] = useState<FocusSettings>(
    DEFAULT_FOCUS_SETTINGS
  );
  const [youtubeAuth, setYouTubeAuth] = useState<YouTubeAuthState>(
    DEFAULT_YOUTUBE_AUTH_STATE
  );
  const [saveError, setSaveError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const now = useTemporaryDisableNow(settings.disabledUntil);
  const temporaryDisableUi = getTemporaryDisableUiState(settings, { now });

  useEffect(() => subscribeToFocusSettings(setSettings), []);
  useEffect(() => subscribeToYouTubeAuthState(setYouTubeAuth), []);

  const handleToggleFocus = (enabled: boolean) => {
    setSaveError(false);
    patchFocusSettings({
      focusModeEnabled: enabled,
      disabledUntil: null,
    }).catch(() =>
      setSaveError(true)
    );
  };

  const handleTemporaryDisable = (minutes: TemporaryDisablePresetMinutes) => {
    setSaveError(false);
    void patchFocusSettings({
      focusModeEnabled: true,
      disabledUntil: createTemporaryDisableUntilIso(minutes),
    }).catch(() => setSaveError(true));
  };

  const handleResumeNow = () => {
    setSaveError(false);
    void patchFocusSettings({ disabledUntil: null }).catch(() =>
      setSaveError(true)
    );
  };

  const handleOpenOptions = () => {
    if (typeof chrome === "undefined") {
      return;
    }

    if (chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
      return;
    }

    if (chrome.runtime?.getURL) {
      window.open(chrome.runtime.getURL("options.html"));
    }
  };

  const handleConnectYouTube = () => {
    if (authLoading) {
      return;
    }

    setAuthError(null);
    setAuthLoading(true);
    void connectYouTubeFromUi().then((response) => {
      setAuthLoading(false);
      if (!response.ok) {
        setAuthError(response.message);
        return;
      }

      if (!response.result.ok && response.result.status === "failed") {
        setAuthError(response.result.message);
      }
    });
  };

  const enabled = settings.focusModeEnabled;

  return (
    <main className="w-[270px] bg-background p-1.5 text-foreground">
      <Card className="border-primary/30 bg-card overflow-hidden backdrop-blur-xl">
        <div className="h-0.5 w-full bg-primary" />
        <CardHeader className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <CardTitle className="text-sm">YouTube Focus</CardTitle>
              <CardDescription className="text-[10px] leading-tight">
                Control Focus Mode and playlist import.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={handleOpenOptions}>
              Settings
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium">Focus mode</p>
              <p className="text-[10px] leading-tight text-muted-foreground">
                {temporaryDisableUi.statusText ??
                  "Hide recommendation-heavy home sections."}
              </p>
            </div>
            <Switch
              aria-label="Toggle focus mode"
              checked={enabled}
              onCheckedChange={handleToggleFocus}
            />
          </div>
          {enabled ? (
            <div className="space-y-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Pause
                </p>
                <Badge variant={temporaryDisableUi.isPaused ? "warning" : "success"} className="text-[10px] h-4 px-1.5">
                  {temporaryDisableUi.isPaused ? "Paused" : "Active"}
                </Badge>
              </div>
              <p className="text-[10px] leading-tight text-muted-foreground">
                {temporaryDisableUi.statusText ??
                  "Pause briefly, resume automatically."}
              </p>
              {temporaryDisableUi.showPauseActions ? (
                <div className="flex flex-wrap gap-1.5">
                  {TEMPORARY_DISABLE_PRESET_MINUTES.map((minutes) => (
                    <Button
                      key={minutes}
                      size="sm"
                      variant="secondary"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => handleTemporaryDisable(minutes)}
                    >
                      {minutes === 60 ? "1h" : `${minutes}m`}
                    </Button>
                  ))}
                </div>
              ) : null}
              {temporaryDisableUi.showResumeAction ? (
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleResumeNow}>
                  Resume now
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardHeader>

        <Separator />

        <CardContent className="space-y-2 p-3">
          <div className="space-y-2 rounded-md border border-border/70 bg-secondary/20 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-muted-foreground">
                YouTube auth
              </span>
              <Badge
                className={getCompactAuthTone(youtubeAuth)}
                variant={getAuthBadgeVariant(youtubeAuth)}
              >
                {getAuthChipText(youtubeAuth)}
              </Badge>
            </div>
            <div className="grid gap-1.5">
              <Button onClick={handleConnectYouTube} disabled={authLoading} size="sm" className="h-7 text-[11px]">
                {authLoading ? "Connecting..." : getAuthPrimaryAction(youtubeAuth)}
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={handleOpenOptions}>
                Open options for fallback setup
              </Button>
            </div>
          </div>

          {saveError ? (
            <p className="text-[10px] text-destructive">Failed to save. Try again.</p>
          ) : null}
          {authError ? (
            <p className="text-[10px] text-destructive">{authError}</p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

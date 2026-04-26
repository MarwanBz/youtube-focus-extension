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
    <main className="w-[320px] bg-background p-3 text-foreground">
      <Card className="border-primary/20 bg-card shadow-[0_4px_24px_rgba(255,78,69,0.08)] backdrop-blur-xl transition-shadow duration-300">
        <CardHeader className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>YouTube Focus</CardTitle>
              <CardDescription className="text-xs">
                Control Focus Mode and playlist import from the popup.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleOpenOptions}>
              Settings
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/70 bg-secondary/30 px-3 py-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Focus mode</p>
              <p className="text-xs text-muted-foreground">
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
            <div className="space-y-2 rounded-md border border-border/70 bg-background/60 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Temporary pause
                </p>
                <Badge variant={temporaryDisableUi.isPaused ? "warning" : "secondary"}>
                  {temporaryDisableUi.isPaused ? "Paused" : "Active"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {temporaryDisableUi.statusText ??
                  "Pause Focus Mode briefly, then let it resume automatically."}
              </p>
              {temporaryDisableUi.showPauseActions ? (
                <div className="flex flex-wrap gap-2">
                  {TEMPORARY_DISABLE_PRESET_MINUTES.map((minutes) => (
                    <Button
                      key={minutes}
                      size="sm"
                      variant="secondary"
                      onClick={() => handleTemporaryDisable(minutes)}
                    >
                      {minutes === 60 ? "1h" : `${minutes}m`}
                    </Button>
                  ))}
                </div>
              ) : null}
              {temporaryDisableUi.showResumeAction ? (
                <Button size="sm" variant="outline" onClick={handleResumeNow}>
                  Resume now
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardHeader>

        <Separator />

        <CardContent className="space-y-3 p-4">
          <div className="space-y-3 rounded-md border border-border/70 bg-secondary/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                YouTube auth
              </span>
              <Badge
                className={getCompactAuthTone(youtubeAuth)}
                variant={getAuthBadgeVariant(youtubeAuth)}
              >
                {getAuthChipText(youtubeAuth)}
              </Badge>
            </div>
            <div className="grid gap-2">
              <Button onClick={handleConnectYouTube} disabled={authLoading}>
                {authLoading ? "Connecting..." : getAuthPrimaryAction(youtubeAuth)}
              </Button>
              <Button variant="outline" onClick={handleOpenOptions}>
                Open options for fallback setup
              </Button>
            </div>
          </div>

          {saveError ? (
            <p className="text-xs text-destructive">Failed to save. Try again.</p>
          ) : null}
          {authError ? (
            <p className="text-xs text-destructive">{authError}</p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

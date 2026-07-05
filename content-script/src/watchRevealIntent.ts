export type WatchRevealSurface = "suggestions" | "comments";

export type WatchRevealIntentState = {
  pendingSurface: WatchRevealSurface | null;
  suggestionsRevealed: boolean;
  commentsRevealed: boolean;
};

export type WatchRevealIntentAction =
  | { type: "request"; surface: WatchRevealSurface }
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "reset" };

export const INITIAL_WATCH_REVEAL_INTENT_STATE: WatchRevealIntentState = {
  pendingSurface: null,
  suggestionsRevealed: false,
  commentsRevealed: false,
};

export function watchRevealIntentReducer(
  state: WatchRevealIntentState,
  action: WatchRevealIntentAction
): WatchRevealIntentState {
  switch (action.type) {
    case "request": {
      if (isWatchRevealSurfaceVisible(state, action.surface)) {
        return {
          ...state,
          pendingSurface: null,
        };
      }

      return {
        ...state,
        pendingSurface: action.surface,
      };
    }

    case "confirm": {
      if (state.pendingSurface === "suggestions") {
        return {
          ...state,
          pendingSurface: null,
          suggestionsRevealed: true,
        };
      }

      if (state.pendingSurface === "comments") {
        return {
          ...state,
          pendingSurface: null,
          commentsRevealed: true,
        };
      }

      return state;
    }

    case "cancel":
      if (state.pendingSurface === null) {
        return state;
      }

      return {
        ...state,
        pendingSurface: null,
      };

    case "reset":
      if (
        state.pendingSurface === null &&
        !state.suggestionsRevealed &&
        !state.commentsRevealed
      ) {
        return state;
      }

      return INITIAL_WATCH_REVEAL_INTENT_STATE;

    default:
      return state;
  }
}

export function isWatchRevealSurfaceVisible(
  state: WatchRevealIntentState,
  surface: WatchRevealSurface
) {
  return surface === "suggestions"
    ? state.suggestionsRevealed
    : state.commentsRevealed;
}

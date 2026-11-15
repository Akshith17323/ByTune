import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { DEFAULT_PANEL_WIDTHS, PANEL_DIVIDER_WIDTH, PANEL_MIN_WIDTH, fitPanelWidths, panelMaxWidth, resizePanel, type SidePanel } from "../lib/panelLayout";
import { usePanelLayout } from "../stores/panelLayout";
import { PanelDivider } from "./PanelDivider";

/** Only this shell rerenders during a drag; the page, playback and scroll position stay mounted. */
export function ResizablePanels({ library, nowPlaying, children }: { library: ReactNode; nowPlaying: ReactNode; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const preferred = usePanelLayout((s) => s.widths);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hydrated, setHydrated] = useState(usePanelLayout.persist.hasHydrated());

  useEffect(() => {
    const off = usePanelLayout.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(usePanelLayout.persist.hasHydrated());
    return off;
  }, []);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = (): void => setContainerWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A smaller window fits the saved widths temporarily. Making it larger brings
  // them back; only an intentional resize or reset changes the saved preference.
  const widths = fitPanelWidths(preferred, containerWidth);
  const resize = (panel: SidePanel, width: number): void => {
    const next = resizePanel(widths, panel, width, containerWidth);
    if (next[panel] !== widths[panel]) usePanelLayout.getState().setWidths(next);
  };
  const divider = (panel: SidePanel) => (
    <PanelDivider
      label={panel === "library" ? "Library panel" : "Now Playing panel"}
      controls={panel === "library" ? "library-panel" : "now-playing-panel"}
      side={panel === "library" ? "left" : "right"}
      value={widths[panel]}
      min={PANEL_MIN_WIDTH}
      max={panelMaxWidth(panel, widths, containerWidth)}
      disabled={!hydrated || containerWidth === 0}
      onResize={(width) => resize(panel, width)}
      onReset={() => usePanelLayout.getState().setWidths({ ...preferred, [panel]: DEFAULT_PANEL_WIDTHS[panel] })}
    />
  );

  return (
    <div
      ref={host}
      className="grid flex-1 min-h-0 mx-2 mb-1"
      style={{ gridTemplateColumns: `${widths.library}px ${PANEL_DIVIDER_WIDTH}px minmax(0, 1fr) ${PANEL_DIVIDER_WIDTH}px ${widths.nowPlaying}px` }}
    >
      {library}
      {divider("library")}
      {children}
      {divider("nowPlaying")}
      {nowPlaying}
    </div>
  );
}

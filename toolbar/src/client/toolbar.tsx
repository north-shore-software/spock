// The toolbar itself: a pill of app buttons at the bottom of the page, a
// window above it for whichever app is open, a full-viewport overlay that
// covers the app entirely, and the element picker, which copies an element's
// context for an agent.
//
// It's a React root of its own, inside a shadow root. The page's styles can't
// reach it, and since it's a separate root from the app's, an error in the
// app's render can't take it down. Apps still draw their panels as plain DOM:
// each gets an element the shell keeps mounted in its window. mount.tsx puts
// it on the page.
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ToolbarApp } from "./app";
import { grab } from "./grab";
import { icons } from "./icons";
import { Picker } from "./picker";
import type { SettingsStore } from "./settings";
import type { Shell } from "./shell";
import { spockContext } from "./spock-context";

/** An app, with the element its panel draws into. */
export type MountedApp = ToolbarApp & { panel: HTMLElement };

/** `data-*` flags are present or absent; React would write `"false"`. */
const flag = (on: boolean) => (on ? "" : undefined);

type ToolbarProps = {
  apps: MountedApp[];
  settings: SettingsStore;
  shell: Shell;
  /** The toolbar's own element on the page, whose shadow root this renders into. */
  host: HTMLElement;
};

export function Toolbar({ apps, settings, shell, host }: ToolbarProps) {
  const { open, overlay, picking, notified } = useSyncExternalStore(shell.subscribe, shell.get);
  const { placement, hidden, notifications } = useSyncExternalStore(settings.subscribe, settings.get);
  // While hidden, hovering the strip along the bottom edge brings the bar back.
  const [peek, setPeek] = useState(false);
  const [toast, showToast] = useToast();

  const pick = useCallback(
    async (element: Element) => {
      shell.setPicking(false);
      try {
        const { componentName, text } = await grab(element);
        const spock = spockContext();
        await navigator.clipboard.writeText(spock ? `${text}\n\n${spock}` : text);
        showToast({ text: `Copied ${componentName ?? `<${element.tagName.toLowerCase()}>`}` });
      } catch (error) {
        console.error("[spock toolbar] Couldn't copy the element's context:", error);
        showToast({ text: "Couldn't copy the element", error: true });
      }
    },
    [shell, showToast],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const { open, overlay, picking } = shell.get();
      if (picking) shell.setPicking(false);
      else if (open !== undefined) shell.setOpen(undefined);
      else if (overlay) shell.setOverlay(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shell]);

  return (
    <div
      className="toolbar"
      data-placement={placement}
      data-hidden={flag(hidden)}
      data-quiet={flag(!notifications)}
      data-peek={flag(peek)}
      data-open={flag(open !== undefined)}
      data-overlay={flag(overlay)}
      data-picking={flag(picking)}
      onMouseLeave={() => setPeek(false)}
    >
      <Overlay open={overlay} onClose={() => shell.setOverlay(false)} />
      {picking && <Picker host={host} onPick={pick} />}
      {apps.map((app) => (
        <Window key={app.id} app={app} open={open === app.id} onClose={() => shell.setOpen(undefined)} />
      ))}
      <div className="hitbox" onMouseEnter={() => setPeek(true)} />
      <div className="bar" role="toolbar" aria-label="Spock dev toolbar">
        {apps.map((app, index) => (
          <Fragment key={app.id}>
            {/* The last app (Settings) sits apart from the rest, as in Astro's
                toolbar, next to the select and full screen buttons. */}
            {index === apps.length - 1 && (
              <>
                {apps.length > 1 && <div className="separator" />}
                <BarButton
                  label="Select element"
                  icon={icons.select}
                  pressed={picking}
                  onClick={() => shell.setPicking(!picking)}
                />
                <BarButton
                  label="Full screen"
                  icon={icons.fullscreen}
                  pressed={overlay}
                  onClick={() => shell.setOverlay(!overlay)}
                />
              </>
            )}
            <BarButton
              label={app.name}
              icon={app.icon}
              pressed={open === app.id}
              badge={notified.has(app.id)}
              onClick={() => shell.setOpen(open === app.id ? undefined : app.id)}
            />
          </Fragment>
        ))}
      </div>
      {toast && (
        <div key={toast.id} className="toast" role="status" data-error={flag(toast.error ?? false)}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

type Toast = { text: string; error?: boolean };

/** A message above the bar for a couple of seconds. Showing another replaces it. */
function useToast() {
  const [toast, setToast] = useState<Toast & { id: number }>();
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), 2000);
    return () => clearTimeout(timer);
  }, [toast]);
  const show = useCallback((next: Toast) => setToast((last) => ({ ...next, id: (last?.id ?? 0) + 1 })), []);
  return [toast, show] as const;
}

function BarButton(props: { label: string; icon: string; pressed: boolean; badge?: boolean; onClick: () => void }) {
  return (
    <button
      className="app"
      type="button"
      aria-label={props.label}
      aria-pressed={props.pressed}
      data-notify={flag(props.badge ?? false)}
      onClick={props.onClick}
    >
      <Icon markup={props.icon} />
      {props.badge !== undefined && <span className="badge" />}
      <span className="tooltip" aria-hidden="true">
        {props.label}
      </span>
    </button>
  );
}

/** A window above the bar. It stays mounted while closed, so the app's panel does too. */
function Window({ app, open, onClose }: { app: MountedApp; open: boolean; onClose: () => void }) {
  return (
    <section className="window" aria-label={app.name} hidden={!open}>
      <header>
        <h2>{app.name}</h2>
        <CloseButton label={`Close ${app.name}`} onClick={onClose} />
      </header>
      <Slot className="window-body" element={app.panel} />
    </section>
  );
}

/** Covers the whole viewport, under the bar. A placeholder for now: the apps' content will move in here. */
function Overlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <section className="overlay" aria-label="Spock" hidden={!open}>
      <header>
        <h2>Spock</h2>
        <CloseButton label="Close full screen" onClick={onClose} />
      </header>
      <div className="overlay-body">
        <p className="empty">Nothing here yet.</p>
      </div>
    </section>
  );
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="close" type="button" aria-label={label} onClick={onClick}>
      <Icon markup={icons.close} />
    </button>
  );
}

/** One of the toolbar's own icons. The wrapper has `display: contents`, so the SVG lays out as if it were bare. */
function Icon({ markup }: { markup: string }) {
  return <span className="icon" dangerouslySetInnerHTML={{ __html: markup }} />;
}

/** A div holding an element React doesn't manage: an app's plain-DOM panel. */
function Slot({ element, className }: { element: HTMLElement; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current!.append(element);
    return () => element.remove();
  }, [element]);
  return <div ref={ref} className={className} />;
}

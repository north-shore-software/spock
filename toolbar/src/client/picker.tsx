// Picking an element on the page, to copy its context for an agent. While it's
// mounted, the page gets no pointer presses: hovering highlights the element
// under the cursor, labelled with its component, and clicking picks it. The
// toolbar itself still takes clicks, so its buttons keep working.
import { useEffect, useState } from "react";
import { boundsOf, elementAt, grab, type Bounds } from "./grab";

type Target = { element: Element; bounds: Bounds; componentName: string | null };

/** Presses the page shouldn't see while picking. `click` is handled on its own. */
const blocked = ["pointerdown", "pointerup", "mousedown", "mouseup", "dblclick", "auxclick"] as const;

export function Picker({ host, onPick }: { host: HTMLElement; onPick: (element: Element) => void }) {
  const [target, setTarget] = useState<Target>();

  useEffect(() => {
    const isToolbar = (element: Element) => element === host || element.getRootNode() === host.shadowRoot;
    const fromToolbar = (event: Event) => event.composedPath().includes(host);

    let pointer: { x: number; y: number } | undefined;
    let current: Target | undefined;
    let frame = 0;

    const show = (next: Target | undefined) => {
      current = next;
      setTarget(next);
    };
    // Once per frame: find the element under the pointer and where it is now.
    const update = () => {
      frame = 0;
      const element = pointer && elementAt(pointer.x, pointer.y, isToolbar);
      if (!element) return show(undefined);
      if (element === current?.element) return show({ ...current, bounds: boundsOf(element) });
      show({ element, bounds: boundsOf(element), componentName: null });
      // The label's component name. React Grab reads it with the rest of the
      // context, so it arrives a moment later.
      grab(element).then(
        ({ componentName }) => current?.element === element && show({ ...current, componentName }),
        () => {},
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const onMove = (event: PointerEvent) => {
      pointer = fromToolbar(event) ? undefined : { x: event.clientX, y: event.clientY };
      schedule();
    };
    const onOut = (event: PointerEvent) => {
      // Left the window.
      if (event.relatedTarget !== null) return;
      pointer = undefined;
      schedule();
    };
    const block = (event: Event) => {
      if (fromToolbar(event)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const onClick = (event: MouseEvent) => {
      if (fromToolbar(event)) return;
      block(event);
      const element = elementAt(event.clientX, event.clientY, isToolbar);
      if (element) onPick(element);
    };

    // A crosshair everywhere on the page; the toolbar's shadow root keeps its own cursors.
    const cursor = document.createElement("style");
    cursor.textContent = "* { cursor: crosshair !important; }";
    document.head.append(cursor);

    // Capturing on window runs before the app's own listeners, React's included.
    const options = { capture: true } as const;
    window.addEventListener("pointermove", onMove, options);
    window.addEventListener("pointerout", onOut, options);
    window.addEventListener("scroll", schedule, options);
    window.addEventListener("resize", schedule);
    window.addEventListener("click", onClick, options);
    for (const type of blocked) window.addEventListener(type, block, options);
    return () => {
      cancelAnimationFrame(frame);
      cursor.remove();
      window.removeEventListener("pointermove", onMove, options);
      window.removeEventListener("pointerout", onOut, options);
      window.removeEventListener("scroll", schedule, options);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("click", onClick, options);
      for (const type of blocked) window.removeEventListener(type, block, options);
    };
  }, [host, onPick]);

  if (!target) return null;
  const { x, y, width, height, borderRadius } = target.bounds;
  return (
    <>
      <div className="pick-box" style={{ left: x, top: y, width, height, borderRadius }} />
      {/* Above the box, or inside it when there's no room above. */}
      <div className="pick-label" data-inside={y < 28 ? "" : undefined} style={{ left: x, top: y }}>
        {target.componentName && <span className="pick-component">{target.componentName}</span>}
        <span className="pick-tag">{target.element.tagName.toLowerCase()}</span>
      </div>
    </>
  );
}

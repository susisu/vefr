import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  type Placement,
} from "@floating-ui/react";
import { useState, type ReactElement, type ReactNode } from "react";
import styles from "./Tooltip.module.css";

/**
 * Hover / focus tooltip wrapping `@floating-ui/react`. Renders an inline
 * wrapper around `children` as the anchor; on hover or focus, `content` is
 * rendered into a portalled floating box positioned beside it (auto-flipped
 * + shifted to stay within the viewport).
 *
 * The wrapper is `inline-flex` so its bounding box matches the trigger and
 * mouseenter / mouseleave fire reliably regardless of what `children` renders.
 */
export function Tooltip({
  children,
  content,
  placement = "top",
}: {
  children: ReactNode;
  content: ReactNode;
  placement?: Placement;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  // floating-ui types `setReference` / `setFloating` as methods, but they are
  // stable callback refs that don't read `this` — destructuring is safe here.
  // eslint-disable-next-line @typescript-eslint/unbound-method -- floating-ui callback ref boundary
  const { setReference, setFloating } = refs;
  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  return (
    <>
      <span ref={setReference} className={styles.anchor} {...getReferenceProps()}>
        {children}
      </span>
      {open ?
        <FloatingPortal>
          <div
            ref={setFloating}
            style={floatingStyles}
            className={styles.tooltip}
            {...getFloatingProps()}
          >
            {content}
          </div>
        </FloatingPortal>
      : null}
    </>
  );
}

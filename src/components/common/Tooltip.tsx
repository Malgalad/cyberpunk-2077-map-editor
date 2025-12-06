import * as React from "react";

import { clsx } from "../../utilities/utilities.ts";

interface TooltipProps {
  children: React.ReactElement<
    React.HTMLProps<Element> & { "data-tooltip": string; "data-flow": string }
  >;
  flow?: "top" | "bottom" | "left" | "right";
  tooltip: string;
  tooltip2?: string;
  tooltip2Timeout?: number;
}

function Tooltip(props: TooltipProps) {
  const {
    children,
    flow = "top",
    tooltip,
    tooltip2,
    tooltip2Timeout = 1000,
  } = props;
  const [showTooltip, setShowTooltip] = React.useState(false);
  const onClick = React.useCallback(
    async (event: React.MouseEvent) => {
      const result = children.props.onClick?.(event);
      if (tooltip2) {
        await result;
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), tooltip2Timeout);
      }
      return result;
    },
    [children.props, tooltip2, tooltip2Timeout],
  );

  return React.cloneElement(children, {
    className: clsx(children.props.className, "tooltip"),
    onClick,
    "data-tooltip": showTooltip ? tooltip2 : tooltip,
    "data-flow": flow,
  });
}

export default Tooltip;

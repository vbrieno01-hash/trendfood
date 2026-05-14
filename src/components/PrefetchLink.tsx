import { forwardRef, useCallback } from "react";
import { Link, LinkProps } from "react-router-dom";
import { prefetchRoute, routeKeyForPath } from "@/lib/routeLoaders";

/**
 * Drop-in replacement para <Link> do react-router-dom.
 * No hover/focus dispara o import() do chunk da rota destino,
 * eliminando a espera de download no clique.
 */
const PrefetchLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, onMouseEnter, onFocus, onTouchStart, ...rest }, ref) => {
    const prefetch = useCallback(() => {
      try {
        const path = typeof to === "string" ? to : (to as { pathname?: string })?.pathname || "";
        const key = routeKeyForPath(path);
        if (key) prefetchRoute(key);
      } catch {}
    }, [to]);

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={(e) => {
          prefetch();
          onMouseEnter?.(e);
        }}
        onFocus={(e) => {
          prefetch();
          onFocus?.(e);
        }}
        onTouchStart={(e) => {
          prefetch();
          onTouchStart?.(e);
        }}
        {...rest}
      />
    );
  }
);
PrefetchLink.displayName = "PrefetchLink";

export default PrefetchLink;
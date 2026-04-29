/**
 * Patch for @radix-ui/react-compose-refs@1.1.2 infinite setRef loop.
 * See: https://github.com/radix-ui/primitives/issues/3664
 * 
 * The bug: composeRefs treats ref callback return values as cleanup functions,
 * but when Presence's ref callback (which calls setState) returns undefined,
 * the composed ref gets recreated on each render → infinite loop.
 * 
 * This patch replaces the buggy module at Vite resolution level.
 */
import * as React from "react";

function setRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (typeof ref === "function") {
    // Don't capture return value — prevents treating setState returns as cleanups
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    (ref as React.MutableRefObject<T>).current = value;
  }
}

export function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T) => {
    refs.forEach((ref) => setRef(ref, node));
  };
}

export function useComposedRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback((node: T) => {
    refs.forEach((ref) => setRef(ref, node));
  }, refs);
}

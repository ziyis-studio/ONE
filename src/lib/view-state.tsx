import { createContext, useContext, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
type Views = Record<string, unknown>;
const Context = createContext<{
  values: Views;
  setValues: Dispatch<SetStateAction<Views>>;
} | null>(null);
/** Kept for this workspace visit; signing out drops searches and filters. */
export function ViewStateProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Views>({});
  return (
    <Context.Provider value={{ values, setValues }}>
      {children}
    </Context.Provider>
  );
}
export function useViewState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const context = useContext(Context);
  const [local, setLocal] = useState(initial);
  if (!context) return [local, setLocal];
  const value = Object.hasOwn(context.values, key)
    ? (context.values[key] as T)
    : initial;
  return [
    value,
    (next) =>
      context.setValues((previous) => {
        const current = Object.hasOwn(previous, key)
          ? (previous[key] as T)
          : initial;
        return {
          ...previous,
          [key]:
            typeof next === "function"
              ? (next as (value: T) => T)(current)
              : next,
        };
      }),
  ];
}
export function useResetViews() {
  const context = useContext(Context);
  return () => context?.setValues({});
}

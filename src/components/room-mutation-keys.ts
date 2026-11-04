"use client";

import { useRef } from "react";

export function useRoomMutationKeys() {
  const keys = useRef(new Map<string, string>());
  return {
    get(action: string) {
      let key = keys.current.get(action);
      if (!key) { key = crypto.randomUUID(); keys.current.set(action, key); }
      return key;
    },
    done(action: string) { keys.current.delete(action); },
  };
}

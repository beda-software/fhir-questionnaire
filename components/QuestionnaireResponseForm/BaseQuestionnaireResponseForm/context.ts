import { createContext } from 'react';

import { ItemContext } from 'sdc-qrf';

// Form-root ItemContext, used as a fallback for group instances that exist only in the UI
// (the blank instance of an empty repeatable group) — they have no QR branch yet, so
// sdc-qrf provides no per-instance context for them.
export const RootItemContext = createContext<ItemContext | undefined>(undefined);

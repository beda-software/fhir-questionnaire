import { createContext } from 'react';

import { expandEMRValueSet } from '../services/valueset-expand';

export const ValueSetExpandProvider = createContext(expandEMRValueSet);

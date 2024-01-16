import { Meta as FHIRMeta } from 'fhir/r4b';

import { Meta as FCEMeta } from 'contrib/aidbox';

import { extractExtension } from '../../../converter';

export function processMeta(meta: FHIRMeta): FCEMeta {
    const { extension, ...commonMeta } = meta;
    const fceMeta: FCEMeta = { ...commonMeta };
    if (extension) {
        fceMeta.createdAt = extractExtension(extension, 'ex:createdAt');
    }
    return fceMeta;
}

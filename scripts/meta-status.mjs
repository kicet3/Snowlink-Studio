import { metaCredentials } from '../server/config.mjs';
import { metaSetupStatus } from '../server/meta.mjs';

// Deliberately prints only presence/implementation state, never credential values.
console.log(JSON.stringify(metaSetupStatus(metaCredentials), null, 2));

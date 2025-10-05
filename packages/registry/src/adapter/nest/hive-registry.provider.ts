import { Provider } from '@nestjs/common';
import { HiveRegistry } from '../../hive-registry';

export const HIVE_REGISTRY = 'HIVE_REGISTRY';

export const hiveRegistryProvider: Provider = {
  provide: HIVE_REGISTRY,
  useFactory: () => {
    const registry = new HiveRegistry();
    // TODO: Add initial agents from config
    return registry;
  },
};

import { DynamicModule, Module } from '@nestjs/common';
import {
  hiveRegistryProvider,
  HIVE_REGISTRY,
} from './hive-registry.provider';
import { HiveRegistry } from '../../hive-registry';

@Module({})
export class HiveRegistryModule {
  static forRoot(): DynamicModule {
    return {
      module: HiveRegistryModule,
      providers: [hiveRegistryProvider],
      exports: [hiveRegistryProvider],
    };
  }
}

export { HiveRegistry, HIVE_REGISTRY };

import { CapabilitySchema } from "./capability-schema.interface";


/**
 * Interface for H.I.V.E. capability definition
 */
export interface Capability {
  id: string;
  description?: string;
  input: CapabilitySchema;
  output: CapabilitySchema;
}

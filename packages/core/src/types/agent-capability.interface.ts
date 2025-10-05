/**
 * Interface for H.I.V.E. capability definition
 */
export interface IAgentCapability {
  id: string;
  description?: string;
  input: { [key: string]: any };
  output: { [key: string]: any };
}

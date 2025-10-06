import * as fs from 'fs';
import { Config } from './config';
import { HiveError } from './hive-error';

// Mock fs
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Config', () => {
  const validYamlContent = `
id: 'hive:agentid:test123'
name: 'Test Agent'
description: 'Test agent for unit tests'
version: '1.0.0'
port: 11100
logLevel: 'info'
capabilities:
  - id: 'text-processing'
    description: 'Process text'
    input:
      text: 'string'
      operation: 'string'
    output:
      result: 'string'
  `;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(validYamlContent);
  });

  it('should load valid config file', () => {
    const config = new Config('test.yml');
    expect(config.agentId()).toBe('hive:agentid:test123');
    expect(config.name()).toBe('Test Agent');
    expect(config.port()).toBe(11100);
    expect(config.capabilities()).toHaveLength(1);
    expect(config.hasCapability('text-processing')).toBe(true);
  });

  it('should throw error if file does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);
    
    expect(() => new Config('nonexistent.yml')).toThrow(HiveError);
    expect(() => new Config('nonexistent.yml')).toThrow(/Configuration file not found/);
  });

  it('should throw error for invalid agent ID format', () => {
    mockedFs.readFileSync.mockReturnValue(`
      id: 'invalid-id'
      name: 'Test Agent'
      description: 'Test description'
      capabilities:
        - id: 'test'
          input: { text: 'string' }
          output: { result: 'string' }
    `);
    
    expect(() => new Config('test.yml')).toThrow(/Invalid agent ID format/);
  });

  it('should throw error for missing capabilities', () => {
    mockedFs.readFileSync.mockReturnValue(`
      id: 'hive:agentid:test123'
      version: '1.0.0'
      name: 'Test Agent'
      description: 'Test description'
      capabilities: []
    `);
    
    expect(() => new Config('test.yml')).toThrow(/Agent must define at least one capability/);
  });

  it('should get specific capability by ID', () => {
    const config = new Config('test.yml');
    const capability = config.capability('text-processing');
    
    expect(capability).toBeDefined();
    expect(capability?.id).toBe('text-processing');
    expect(capability?.input).toHaveProperty('text');
    expect(capability?.output).toHaveProperty('result');
  });

  it('should apply default values', () => {
    mockedFs.readFileSync.mockReturnValue(`
      id: 'hive:agentid:test123'
      version: '1.0.0'
      name: 'Test Agent'
      description: 'Test description'
      capabilities:
        - id: 'test'
          input: { text: 'string' }
          output: { result: 'string' }
    `);
    
    const config = new Config('test.yml');
    expect(config.port()).toBe(11100); // Default value
    expect(config.logLevel()).toBe('info'); // Default value
  });
});

/**
 * Property-Based Tests for Configuration Merge Precedence
 * 
 * Feature: tdd-assistant, Property 5: Configuration Merge Precedence
 * Validates: Requirements 4.3
 * 
 * Property 5: For any configuration setting that exists in both the config file
 * and CLI flags, the CLI value should always override the file value.
 */

import * as fc from 'fast-check';
import {
  mergeConfigs,
  DEFAULT_CONFIG,
  TDDAssistantConfig,
  PartialConfig,
  NamingConvention
} from './loader';

// Arbitrary for NamingConvention
const namingConventionArb = fc.constantFrom<NamingConvention>('should', 'given_when_then', 'test');

// Arbitrary for a valid package name
const packageNameArb = fc.stringOf(
  fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '.'),
  { minLength: 3, maxLength: 30 }
).filter(s => !s.startsWith('.') && !s.endsWith('.') && !s.includes('..'));

// Arbitrary for a valid directory path
const directoryArb = fc.stringOf(
  fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', '/', '-', '_'),
  { minLength: 1, maxLength: 50 }
).filter(s => !s.startsWith('/') && !s.endsWith('/') && !s.includes('//'));

// Arbitrary for AI model names
const aiModelArb = fc.constantFrom('gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo', 'gpt-4o');

// Arbitrary for API keys
const apiKeyArb = fc.string({ minLength: 10, maxLength: 100 });

// Arbitrary for Spring Boot versions
const springBootVersionArb = fc.constantFrom('2.x', '3.x', '3.0', '3.1', '3.2');

// Arbitrary for a complete TDDAssistantConfig
const fullConfigArb: fc.Arbitrary<TDDAssistantConfig> = fc.record({
  packageName: packageNameArb,
  outputDirectory: directoryArb,
  testNamingConvention: namingConventionArb,
  aiModel: aiModelArb,
  apiKey: fc.option(apiKeyArb, { nil: undefined }),
  springBootVersion: fc.option(springBootVersionArb, { nil: undefined })
});

// Arbitrary for a partial config (simulating file config or CLI overrides)
const partialConfigArb: fc.Arbitrary<PartialConfig> = fc.record({
  packageName: fc.option(packageNameArb, { nil: undefined }),
  outputDirectory: fc.option(directoryArb, { nil: undefined }),
  testNamingConvention: fc.option(namingConventionArb, { nil: undefined }),
  aiModel: fc.option(aiModelArb, { nil: undefined }),
  apiKey: fc.option(apiKeyArb, { nil: undefined }),
  springBootVersion: fc.option(springBootVersionArb, { nil: undefined })
});

describe('Property 5: Configuration Merge Precedence', () => {
  // Feature: tdd-assistant, Property 5: Configuration Merge Precedence
  // Validates: Requirements 4.3

  /**
   * Property: For any configuration setting that exists in both the config file
   * and CLI flags, the CLI value should always override the file value.
   */
  it('should always use CLI value when both CLI and file config provide the same setting', () => {
    fc.assert(
      fc.property(
        fullConfigArb,  // defaults
        partialConfigArb,  // file config
        partialConfigArb,  // CLI overrides
        (defaults, fileConfig, cliOverrides) => {
          const result = mergeConfigs(defaults, fileConfig, cliOverrides);

          // For each property, verify CLI takes precedence over file config
          if (cliOverrides.packageName !== undefined) {
            expect(result.packageName).toBe(cliOverrides.packageName);
          }
          if (cliOverrides.outputDirectory !== undefined) {
            expect(result.outputDirectory).toBe(cliOverrides.outputDirectory);
          }
          if (cliOverrides.testNamingConvention !== undefined) {
            expect(result.testNamingConvention).toBe(cliOverrides.testNamingConvention);
          }
          if (cliOverrides.aiModel !== undefined) {
            expect(result.aiModel).toBe(cliOverrides.aiModel);
          }
          if (cliOverrides.apiKey !== undefined) {
            expect(result.apiKey).toBe(cliOverrides.apiKey);
          }
          if (cliOverrides.springBootVersion !== undefined) {
            expect(result.springBootVersion).toBe(cliOverrides.springBootVersion);
          }
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Property: When CLI does not provide a value but file config does,
   * the file config value should be used.
   */
  it('should use file config value when CLI does not provide the setting', () => {
    fc.assert(
      fc.property(
        fullConfigArb,  // defaults
        partialConfigArb,  // file config with values
        (defaults, fileConfig) => {
          // CLI overrides with no values
          const cliOverrides: PartialConfig = {};
          
          const result = mergeConfigs(defaults, fileConfig, cliOverrides);

          // File config should take precedence over defaults when CLI is empty
          if (fileConfig.packageName !== undefined) {
            expect(result.packageName).toBe(fileConfig.packageName);
          }
          if (fileConfig.outputDirectory !== undefined) {
            expect(result.outputDirectory).toBe(fileConfig.outputDirectory);
          }
          if (fileConfig.testNamingConvention !== undefined) {
            expect(result.testNamingConvention).toBe(fileConfig.testNamingConvention);
          }
          if (fileConfig.aiModel !== undefined) {
            expect(result.aiModel).toBe(fileConfig.aiModel);
          }
          if (fileConfig.apiKey !== undefined) {
            expect(result.apiKey).toBe(fileConfig.apiKey);
          }
          if (fileConfig.springBootVersion !== undefined) {
            expect(result.springBootVersion).toBe(fileConfig.springBootVersion);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When neither CLI nor file config provides a value,
   * the default value should be used.
   */
  it('should use default value when neither CLI nor file config provides the setting', () => {
    fc.assert(
      fc.property(
        fullConfigArb,  // defaults
        (defaults) => {
          // Empty file config and CLI overrides
          const fileConfig: PartialConfig = {};
          const cliOverrides: PartialConfig = {};
          
          const result = mergeConfigs(defaults, fileConfig, cliOverrides);

          // All values should come from defaults
          expect(result.packageName).toBe(defaults.packageName);
          expect(result.outputDirectory).toBe(defaults.outputDirectory);
          expect(result.testNamingConvention).toBe(defaults.testNamingConvention);
          expect(result.aiModel).toBe(defaults.aiModel);
          expect(result.apiKey).toBe(defaults.apiKey);
          expect(result.springBootVersion).toBe(defaults.springBootVersion);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The merge result should always be a complete TDDAssistantConfig
   * with all required fields defined.
   */
  it('should always produce a complete config with all required fields', () => {
    fc.assert(
      fc.property(
        fullConfigArb,
        partialConfigArb,
        partialConfigArb,
        (defaults, fileConfig, cliOverrides) => {
          const result = mergeConfigs(defaults, fileConfig, cliOverrides);

          // All required fields should be defined
          expect(result.packageName).toBeDefined();
          expect(typeof result.packageName).toBe('string');
          
          expect(result.outputDirectory).toBeDefined();
          expect(typeof result.outputDirectory).toBe('string');
          
          expect(result.testNamingConvention).toBeDefined();
          expect(['should', 'given_when_then', 'test']).toContain(result.testNamingConvention);
          
          expect(result.aiModel).toBeDefined();
          expect(typeof result.aiModel).toBe('string');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Merge operation should be deterministic - same inputs always produce same outputs.
   */
  it('should be deterministic - same inputs always produce same outputs', () => {
    fc.assert(
      fc.property(
        fullConfigArb,
        partialConfigArb,
        partialConfigArb,
        (defaults, fileConfig, cliOverrides) => {
          const result1 = mergeConfigs(defaults, fileConfig, cliOverrides);
          const result2 = mergeConfigs(defaults, fileConfig, cliOverrides);

          expect(result1).toEqual(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Verify the three-tier precedence chain:
   * CLI > File > Defaults
   */
  it('should follow strict precedence: CLI > File > Defaults', () => {
    fc.assert(
      fc.property(
        // Generate three distinct values for each field to test precedence
        packageNameArb,
        packageNameArb,
        packageNameArb,
        aiModelArb,
        aiModelArb,
        aiModelArb,
        (defaultPkg, filePkg, cliPkg, defaultModel, fileModel, cliModel) => {
          const defaults: TDDAssistantConfig = {
            ...DEFAULT_CONFIG,
            packageName: defaultPkg,
            aiModel: defaultModel
          };
          
          const fileConfig: PartialConfig = {
            packageName: filePkg,
            aiModel: fileModel
          };
          
          const cliOverrides: PartialConfig = {
            packageName: cliPkg,
            aiModel: cliModel
          };

          const result = mergeConfigs(defaults, fileConfig, cliOverrides);

          // CLI should always win
          expect(result.packageName).toBe(cliPkg);
          expect(result.aiModel).toBe(cliModel);
        }
      ),
      { numRuns: 100 }
    );
  });
});

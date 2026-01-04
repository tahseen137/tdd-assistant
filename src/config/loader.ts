/**
 * Configuration Loader
 * Loads and merges configuration from file and CLI
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import * as fs from 'fs';
import * as path from 'path';

export type NamingConvention = 'should' | 'given_when_then' | 'test';

/**
 * TDD Assistant configuration interface
 * Defines all configurable options for the tool
 */
export interface TDDAssistantConfig {
  packageName: string;
  outputDirectory: string;
  testNamingConvention: NamingConvention;
  aiModel: string;
  apiKey?: string;
  springBootVersion?: string;
}

/**
 * Default configuration values
 * Used when no config file or CLI overrides are provided
 * Requirement: 4.4
 */
export const DEFAULT_CONFIG: TDDAssistantConfig = {
  packageName: 'com.example',
  outputDirectory: 'src/test/java',
  testNamingConvention: 'should',
  aiModel: 'gpt-4',
  apiKey: undefined,
  springBootVersion: '3.x'
};

/**
 * Configuration file name
 */
export const CONFIG_FILE_NAME = '.tdd-assistant.json';

/**
 * Partial config type for CLI overrides
 */
export type PartialConfig = Partial<TDDAssistantConfig>;

/**
 * Result of config file loading
 */
export interface ConfigLoadResult {
  config: TDDAssistantConfig;
  source: 'file' | 'defaults';
  filePath?: string;
}

/**
 * Validates a naming convention value
 */
export function isValidNamingConvention(value: unknown): value is NamingConvention {
  return value === 'should' || value === 'given_when_then' || value === 'test';
}


/**
 * Finds the config file by searching from the current directory up to the root
 * Requirement: 4.1
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const configPath = path.join(currentDir, CONFIG_FILE_NAME);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    currentDir = path.dirname(currentDir);
  }

  // Check root directory as well
  const rootConfigPath = path.join(root, CONFIG_FILE_NAME);
  if (fs.existsSync(rootConfigPath)) {
    return rootConfigPath;
  }

  return null;
}

/**
 * Loads configuration from a JSON file
 * Requirement: 4.1
 */
export function loadConfigFromFile(filePath: string): PartialConfig {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    
    // Validate and sanitize the loaded config
    const config: PartialConfig = {};
    
    if (typeof parsed.packageName === 'string') {
      config.packageName = parsed.packageName;
    }
    
    if (typeof parsed.outputDirectory === 'string') {
      config.outputDirectory = parsed.outputDirectory;
    }
    
    if (isValidNamingConvention(parsed.testNamingConvention)) {
      config.testNamingConvention = parsed.testNamingConvention;
    }
    
    if (typeof parsed.aiModel === 'string') {
      config.aiModel = parsed.aiModel;
    }
    
    if (typeof parsed.apiKey === 'string') {
      config.apiKey = parsed.apiKey;
    }
    
    if (typeof parsed.springBootVersion === 'string') {
      config.springBootVersion = parsed.springBootVersion;
    }
    
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Merges configurations with proper precedence:
 * CLI overrides > File config > Defaults
 * Requirement: 4.3
 */
export function mergeConfigs(
  defaults: TDDAssistantConfig,
  fileConfig: PartialConfig,
  cliOverrides: PartialConfig
): TDDAssistantConfig {
  return {
    packageName: cliOverrides.packageName ?? fileConfig.packageName ?? defaults.packageName,
    outputDirectory: cliOverrides.outputDirectory ?? fileConfig.outputDirectory ?? defaults.outputDirectory,
    testNamingConvention: cliOverrides.testNamingConvention ?? fileConfig.testNamingConvention ?? defaults.testNamingConvention,
    aiModel: cliOverrides.aiModel ?? fileConfig.aiModel ?? defaults.aiModel,
    apiKey: cliOverrides.apiKey ?? fileConfig.apiKey ?? defaults.apiKey,
    springBootVersion: cliOverrides.springBootVersion ?? fileConfig.springBootVersion ?? defaults.springBootVersion
  };
}

/**
 * ConfigLoader class for loading and managing configuration
 * Implements the ConfigLoader interface from the design document
 */
export class ConfigLoader {
  private configFilePath: string | null = null;
  
  /**
   * Loads configuration with the following precedence:
   * 1. CLI overrides (highest priority)
   * 2. Config file settings
   * 3. Default values (lowest priority)
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  load(cliOverrides: PartialConfig = {}, customConfigPath?: string): ConfigLoadResult {
    let fileConfig: PartialConfig = {};
    let source: 'file' | 'defaults' = 'defaults';
    
    // Determine config file path
    if (customConfigPath) {
      // Use custom config path if provided
      if (fs.existsSync(customConfigPath)) {
        this.configFilePath = customConfigPath;
        fileConfig = loadConfigFromFile(customConfigPath);
        source = 'file';
      } else {
        throw new Error(`Config file not found: ${customConfigPath}`);
      }
    } else {
      // Search for config file in project hierarchy
      const foundPath = findConfigFile();
      if (foundPath) {
        this.configFilePath = foundPath;
        fileConfig = loadConfigFromFile(foundPath);
        source = 'file';
      }
    }
    
    // Merge configs with proper precedence
    const config = mergeConfigs(DEFAULT_CONFIG, fileConfig, cliOverrides);
    
    return {
      config,
      source: Object.keys(fileConfig).length > 0 ? 'file' : 'defaults',
      filePath: this.configFilePath ?? undefined
    };
  }
  
  /**
   * Gets the path to the loaded config file, if any
   */
  getConfigFilePath(): string | null {
    return this.configFilePath;
  }
}

/**
 * Creates a new ConfigLoader instance
 */
export function createConfigLoader(): ConfigLoader {
  return new ConfigLoader();
}

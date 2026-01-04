#!/usr/bin/env node
/**
 * TDD Assistant CLI Entry Point
 * Handles command-line interface using Commander.js
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CLI Options interface for the generate command
 */
export interface CLIOptions {
  story?: string;
  file?: string;
  output?: string;
  interactive?: boolean;
  config?: string;
  model?: string;
}

/**
 * Result of CLI argument validation
 */
export interface CLIValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that at least one story source is provided
 */
export function validateStorySource(options: CLIOptions): CLIValidationResult {
  if (!options.story && !options.file) {
    return {
      isValid: false,
      error: 'Error: You must provide either --story or --file option.\n\nUsage: tdd-assistant generate --story "<user story>" or --file <path>'
    };
  }
  
  if (options.story && options.file) {
    return {
      isValid: false,
      error: 'Error: Cannot use both --story and --file options together. Please provide only one.\n\nUsage: tdd-assistant generate --story "<user story>" or --file <path>'
    };
  }
  
  return { isValid: true };
}

/**
 * Validates that the file exists and is readable
 */
export function validateFileExists(filePath: string): CLIValidationResult {
  const resolvedPath = path.resolve(filePath);
  
  if (!fs.existsSync(resolvedPath)) {
    return {
      isValid: false,
      error: `Error: File not found: ${filePath}\n\nPlease provide a valid file path.`
    };
  }
  
  try {
    fs.accessSync(resolvedPath, fs.constants.R_OK);
  } catch {
    return {
      isValid: false,
      error: `Error: Cannot read file: ${filePath}\n\nPlease check file permissions.`
    };
  }
  
  return { isValid: true };
}

/**
 * Reads user story from file
 */
export function readStoryFromFile(filePath: string): string {
  const resolvedPath = path.resolve(filePath);
  return fs.readFileSync(resolvedPath, 'utf-8').trim();
}

/**
 * Creates and configures the CLI program
 */
export function createProgram(): Command {
  const program = new Command();
  
  // Get version from package.json
  const packageJsonPath = path.resolve(__dirname, '../../package.json');
  let version = '1.0.0';
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    version = packageJson.version;
  } catch {
    // Use default version if package.json cannot be read
  }
  
  program
    .name('tdd-assistant')
    .description('CLI tool that generates JUnit 5 test scaffolds from user stories for Java/Spring Boot projects')
    .version(version, '-v, --version', 'Display the current version number');
  
  program
    .command('generate')
    .description('Generate test scaffolds from a user story')
    .option('-s, --story <story>', 'User story text in format "As a [role], I want [feature], so that [benefit]"')
    .option('-f, --file <path>', 'Path to a file containing the user story')
    .option('-o, --output <directory>', 'Output directory for generated test files')
    .option('-i, --interactive', 'Enable interactive mode to review and select test cases', false)
    .option('-c, --config <path>', 'Path to configuration file')
    .option('-m, --model <model>', 'AI model to use (e.g., gpt-4, gpt-3.5-turbo)')
    .action(async (options: CLIOptions) => {
      await handleGenerateCommand(options);
    });
  
  // Handle unknown commands
  program.on('command:*', (operands) => {
    console.error(`Error: Unknown command '${operands[0]}'.\n`);
    console.error('Run "tdd-assistant --help" for usage information.');
    process.exit(1);
  });
  
  return program;
}

/**
 * Handles the generate command execution
 */
export async function handleGenerateCommand(options: CLIOptions): Promise<void> {
  // Validate story source
  const sourceValidation = validateStorySource(options);
  if (!sourceValidation.isValid) {
    console.error(sourceValidation.error);
    process.exit(1);
  }
  
  // Get the user story text
  let storyText: string;
  
  if (options.file) {
    // Validate file exists
    const fileValidation = validateFileExists(options.file);
    if (!fileValidation.isValid) {
      console.error(fileValidation.error);
      process.exit(1);
    }
    
    storyText = readStoryFromFile(options.file);
    
    if (!storyText) {
      console.error('Error: The specified file is empty.\n\nPlease provide a file with a valid user story.');
      process.exit(1);
    }
  } else {
    storyText = options.story!;
  }
  
  // Validate story is not empty
  if (!storyText.trim()) {
    console.error('Error: User story cannot be empty.\n\nUsage: tdd-assistant generate --story "<user story>"');
    process.exit(1);
  }
  
  // TODO: The actual generation logic will be implemented in later tasks
  // For now, output a placeholder message
  console.log('Processing user story...');
  console.log(`Story: ${storyText}`);
  
  if (options.output) {
    console.log(`Output directory: ${options.output}`);
  }
  
  if (options.interactive) {
    console.log('Interactive mode enabled');
  }
  
  if (options.model) {
    console.log(`Using AI model: ${options.model}`);
  }
  
  console.log('\nTest generation will be implemented in subsequent tasks.');
}

/**
 * Main entry point
 */
export function main(): void {
  const program = createProgram();
  
  // Parse arguments
  program.parse(process.argv);
  
  // If no arguments provided, show help
  if (process.argv.length <= 2) {
    program.help();
  }
}

// Run CLI when executed directly
if (require.main === module) {
  main();
}

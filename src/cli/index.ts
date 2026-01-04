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
import { ConfigLoader, PartialConfig } from '../config/loader';
import { createStoryParser, UserStory } from '../parser/story-parser';
import { createAIService, APIKeyNotConfiguredError, AIServiceUnavailableError, TestCase } from '../ai/openai-service';
import { createJavaTestGenerator, deriveClassName } from '../generator/java-generator';
import { createOutputWriter } from '../output/writer';
import { createInteractiveSession } from '../interactive/index';

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
  packageName?: string;
  namingConvention?: string;
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
    .option('-p, --package-name <package>', 'Java package name for generated tests')
    .option('-n, --naming-convention <convention>', 'Test naming convention: should, given_when_then, or test')
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
 * Connects CLI → Config → Parser → AI → Generator → Output
 * Requirements: All
 */
export async function handleGenerateCommand(options: CLIOptions): Promise<void> {
  try {
    // Step 1: Validate story source
    const sourceValidation = validateStorySource(options);
    if (!sourceValidation.isValid) {
      console.error(sourceValidation.error);
      process.exit(1);
    }
    
    // Step 2: Get the user story text
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
    
    // Step 3: Load configuration
    console.log('Loading configuration...');
    const configLoader = new ConfigLoader();
    const cliOverrides: PartialConfig = {};
    
    if (options.model) {
      cliOverrides.aiModel = options.model;
    }
    if (options.output) {
      cliOverrides.outputDirectory = options.output;
    }
    if (options.packageName) {
      cliOverrides.packageName = options.packageName;
    }
    if (options.namingConvention) {
      const convention = options.namingConvention.toLowerCase();
      if (convention === 'should' || convention === 'given_when_then' || convention === 'test') {
        cliOverrides.testNamingConvention = convention;
      } else {
        console.error(`Error: Invalid naming convention '${options.namingConvention}'. Use: should, given_when_then, or test`);
        process.exit(1);
      }
    }
    
    const configResult = configLoader.load(cliOverrides, options.config);
    const config = configResult.config;
    
    if (configResult.source === 'file') {
      console.log(`Using configuration from: ${configResult.filePath}`);
    }
    
    // Step 4: Parse the user story
    console.log('Parsing user story...');
    const storyParser = createStoryParser();
    const userStory: UserStory = storyParser.parse(storyText);
    
    // Validate the parsed story
    const validation = storyParser.validate(userStory);
    if (!validation.isValid) {
      console.error('\nWarning: User story may be incomplete:');
      for (const error of validation.errors) {
        console.error(`  - ${error}`);
      }
      console.error('');
      
      // Continue anyway, but warn the user
      if (!userStory.role && !userStory.feature) {
        console.error('Error: Could not parse user story. Please use the format:');
        console.error('  "As a [role], I want [feature], so that [benefit]"');
        process.exit(1);
      }
    }
    
    console.log(`  Role: ${userStory.role || '(not specified)'}`);
    console.log(`  Feature: ${userStory.feature || '(not specified)'}`);
    console.log(`  Benefit: ${userStory.benefit || '(not specified)'}`);
    
    // Step 5: Extract test cases using AI
    console.log('\nAnalyzing user story with AI...');
    const aiService = createAIService({
      apiKey: config.apiKey,
      model: config.aiModel
    });
    
    let testCases: TestCase[];
    try {
      testCases = await aiService.extractTestCases(userStory);
    } catch (error) {
      if (error instanceof APIKeyNotConfiguredError) {
        console.error('\n' + error.message);
        process.exit(1);
      }
      if (error instanceof AIServiceUnavailableError) {
        console.error('\n' + error.message);
        process.exit(1);
      }
      throw error;
    }
    
    console.log(`Generated ${testCases.length} test case(s)`);
    
    if (testCases.length === 0) {
      console.error('\nError: No test cases could be generated from the user story.');
      console.error('Please try providing a more detailed user story with acceptance criteria.');
      process.exit(1);
    }
    
    // Step 6: Interactive mode - allow user to select/edit test cases
    if (options.interactive) {
      console.log('\nEntering interactive mode...');
      const interactiveSession = createInteractiveSession();
      
      const result = await interactiveSession.selectTestCases(testCases);
      
      if (result.cancelled) {
        console.log('Generation cancelled.');
        process.exit(0);
      }
      
      testCases = result.selectedTestCases;
      
      if (testCases.length === 0) {
        console.log('No test cases selected. Exiting.');
        process.exit(0);
      }
    }
    
    // Step 7: Generate Java test code
    console.log('\nGenerating JUnit 5 test code...');
    const generator = createJavaTestGenerator();
    
    // Derive class name from the feature
    const className = deriveClassName(userStory.feature || 'Generated');
    
    const generatedTest = generator.generate(testCases, config, className);
    
    // Step 8: Output the generated code
    const outputWriter = createOutputWriter();
    
    if (options.output || config.outputDirectory !== 'src/test/java') {
      // Write to file
      const outputDir = options.output || config.outputDirectory;
      console.log(`\nWriting test file to: ${outputDir}`);
      
      try {
        const filePath = await outputWriter.writeToFile(generatedTest, outputDir);
        console.log(`\nSuccess! Test file created: ${filePath}`);
        console.log(`\nGenerated ${testCases.length} test method(s):`);
        for (const method of generatedTest.testMethods) {
          console.log(`  - ${method.name}`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('EACCES')) {
          console.error(`\nError: Permission denied writing to ${outputDir}`);
          console.error('Please check directory permissions or try a different output location.');
          process.exit(1);
        }
        throw error;
      }
    } else {
      // Write to stdout
      console.log('\n--- Generated Test Code ---\n');
      outputWriter.writeToStdout(generatedTest);
      console.log('\n--- End of Generated Code ---');
      console.log(`\nGenerated ${testCases.length} test method(s)`);
    }
    
    console.log('\nDone! Remember: These tests are designed to fail initially.');
    console.log('Implement the production code to make them pass (TDD workflow).');
    
  } catch (error) {
    // Handle unexpected errors
    if (error instanceof Error) {
      console.error(`\nError: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    } else {
      console.error('\nAn unexpected error occurred.');
    }
    process.exit(1);
  }
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

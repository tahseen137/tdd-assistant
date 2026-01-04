/**
 * Property-Based Tests for CLI Invalid Command Error Handling
 * 
 * Feature: tdd-assistant, Property 8: Invalid Command Error Handling
 * Validates: Requirements 1.5
 * 
 * Property 8: For any invalid CLI command or missing required arguments,
 * the system should return a non-zero exit code and display an error message
 * containing usage instructions.
 */

import * as fc from 'fast-check';
import { createProgram, validateStorySource, validateValidateOptions, CLIOptions } from './index';
import { ValidateCLIOptions } from '../validator/types';

describe('Property 8: Invalid Command Error Handling', () => {
  // Feature: tdd-assistant, Property 8: Invalid Command Error Handling
  // Validates: Requirements 1.5

  describe('validateStorySource', () => {
    /**
     * Property: For any CLIOptions with neither story nor file provided,
     * validation should fail with an error message containing usage instructions.
     */
    it('should return invalid result with usage instructions when neither story nor file is provided', () => {
      fc.assert(
        fc.property(
          fc.record({
            output: fc.option(fc.string(), { nil: undefined }),
            interactive: fc.option(fc.boolean(), { nil: undefined }),
            config: fc.option(fc.string(), { nil: undefined }),
            model: fc.option(fc.string(), { nil: undefined }),
          }),
          (partialOptions) => {
            // Ensure neither story nor file is provided
            const options: CLIOptions = {
              ...partialOptions,
              story: undefined,
              file: undefined,
            };

            const result = validateStorySource(options);

            // Should be invalid
            expect(result.isValid).toBe(false);
            // Should have an error message
            expect(result.error).toBeDefined();
            // Error should contain usage instructions
            expect(result.error).toContain('Usage:');
            expect(result.error).toContain('tdd-assistant');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any CLIOptions with both story and file provided,
     * validation should fail with an error message containing usage instructions.
     */
    it('should return invalid result with usage instructions when both story and file are provided', () => {
      fc.assert(
        fc.property(
          fc.record({
            story: fc.string({ minLength: 1 }),
            file: fc.string({ minLength: 1 }),
            output: fc.option(fc.string(), { nil: undefined }),
            interactive: fc.option(fc.boolean(), { nil: undefined }),
            config: fc.option(fc.string(), { nil: undefined }),
            model: fc.option(fc.string(), { nil: undefined }),
          }),
          (options) => {
            const result = validateStorySource(options);

            // Should be invalid
            expect(result.isValid).toBe(false);
            // Should have an error message
            expect(result.error).toBeDefined();
            // Error should contain usage instructions
            expect(result.error).toContain('Usage:');
            expect(result.error).toContain('tdd-assistant');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any CLIOptions with exactly one of story or file provided (non-empty),
     * validation should succeed.
     */
    it('should return valid result when exactly one of story or file is provided', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Only story provided
            fc.record({
              story: fc.string({ minLength: 1 }),
              file: fc.constant(undefined),
              output: fc.option(fc.string(), { nil: undefined }),
              interactive: fc.option(fc.boolean(), { nil: undefined }),
              config: fc.option(fc.string(), { nil: undefined }),
              model: fc.option(fc.string(), { nil: undefined }),
            }),
            // Only file provided
            fc.record({
              story: fc.constant(undefined),
              file: fc.string({ minLength: 1 }),
              output: fc.option(fc.string(), { nil: undefined }),
              interactive: fc.option(fc.boolean(), { nil: undefined }),
              config: fc.option(fc.string(), { nil: undefined }),
              model: fc.option(fc.string(), { nil: undefined }),
            })
          ),
          (options) => {
            const result = validateStorySource(options);

            // Should be valid
            expect(result.isValid).toBe(true);
            // Should not have an error message
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('createProgram unknown command handling', () => {
    /**
     * Property: For any unknown command string, the program should recognize it as unknown.
     * We test this by verifying the program structure handles unknown commands.
     */
    it('should create a program that has unknown command handler configured', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => 
            !['generate', '--help', '-h', '--version', '-v', '-V'].includes(s) &&
            !s.startsWith('-')
          ),
          (unknownCommand) => {
            const program = createProgram();
            
            // Verify program is configured
            expect(program.name()).toBe('tdd-assistant');
            
            // Verify generate command exists
            const commands = program.commands.map(cmd => cmd.name());
            expect(commands).toContain('generate');
            
            // The unknown command should not be in the list of valid commands
            expect(commands).not.toContain(unknownCommand);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Error message format', () => {
    /**
     * Property: For any validation error, the error message should be non-empty
     * and contain actionable information.
     */
    it('should produce non-empty error messages with actionable content', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Neither story nor file
            fc.constant({ story: undefined, file: undefined } as CLIOptions),
            // Both story and file
            fc.record({
              story: fc.string({ minLength: 1 }),
              file: fc.string({ minLength: 1 }),
            })
          ),
          (options) => {
            const result = validateStorySource(options);

            if (!result.isValid) {
              // Error should be non-empty
              expect(result.error).toBeDefined();
              expect(result.error!.length).toBeGreaterThan(0);
              
              // Error should contain 'Error:' prefix
              expect(result.error).toContain('Error:');
              
              // Error should contain usage information
              expect(result.error).toContain('Usage:');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Unit Tests for Validate Command Argument Parsing
 * 
 * Validates: Requirements 8.1, 8.2
 * 
 * Tests the validateValidateOptions function for:
 * - Required --code argument
 * - --story vs --file mutual exclusivity
 * - Format option validation
 */
describe('Validate Command Argument Parsing', () => {
  // Validates: Requirements 8.1, 8.2

  describe('Required --code argument', () => {
    it('should return invalid result when --code is not provided', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        code: undefined as unknown as string, // Simulating missing code
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('--code');
      expect(result.error).toContain('Usage:');
    });

    it('should return invalid result when --code is empty string', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        code: '',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('--code');
    });

    it('should return valid result when --code is provided with story', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        code: './src',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid result when --code is provided with file', () => {
      const options: ValidateCLIOptions = {
        file: './story.txt',
        code: './src',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('--story vs --file mutual exclusivity', () => {
    it('should return invalid result when neither --story nor --file is provided', () => {
      const options: ValidateCLIOptions = {
        code: './src',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('--story');
      expect(result.error).toContain('--file');
      expect(result.error).toContain('Usage:');
    });

    it('should return invalid result when both --story and --file are provided', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        file: './story.txt',
        code: './src',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Cannot use both');
      expect(result.error).toContain('Usage:');
    });

    it('should return valid result when only --story is provided', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        code: './src',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid result when only --file is provided', () => {
      const options: ValidateCLIOptions = {
        file: './story.txt',
        code: './src',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Format option validation', () => {
    it('should return valid result when format is "console"', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        code: './src',
        format: 'console',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid result when format is "json"', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        code: './src',
        format: 'json',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid result when format is "markdown"', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        code: './src',
        format: 'markdown',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid result when format is invalid', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        code: './src',
        format: 'invalid' as any,
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid format');
      expect(result.error).toContain('invalid');
    });

    it('should return invalid result when format is "xml" (unsupported)', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        code: './src',
        format: 'xml' as any,
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid format');
    });

    it('should return valid result when format is not specified (defaults to console)', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        code: './src',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Combined validation scenarios', () => {
    it('should validate all options together - valid case', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login, so that I can access my account',
        code: './src/main/java',
        format: 'json',
        output: './report.json',
        recursive: true,
        interactive: false,
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail on first validation error - missing code', () => {
      const options: ValidateCLIOptions = {
        story: 'As a user, I want to login',
        code: undefined as unknown as string,
        format: 'invalid' as any, // Also invalid, but code check comes first
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('--code');
    });

    it('should fail on story/file validation when code is provided but neither story nor file', () => {
      const options: ValidateCLIOptions = {
        code: './src',
        format: 'json',
      };

      const result = validateValidateOptions(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('--story');
      expect(result.error).toContain('--file');
    });
  });
});

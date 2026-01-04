/**
 * AI Service
 * Integrates with OpenAI API for test case extraction
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import OpenAI from 'openai';
import { UserStory } from '../parser/story-parser';

export type TestCaseType = 'happy_path' | 'error' | 'edge_case' | 'boundary';

export interface TestCase {
  name: string;
  description: string;
  type: TestCaseType;
  assertions: string[];
  mockDependencies: string[];
}

/**
 * AIService interface for test case extraction
 */
export interface AIService {
  extractTestCases(story: UserStory): Promise<TestCase[]>;
  isAvailable(): Promise<boolean>;
}

/**
 * Error thrown when API key is not configured
 * Requirement: 5.2
 */
export class APIKeyNotConfiguredError extends Error {
  constructor() {
    super(
      'OpenAI API key is not configured.\n\n' +
      'To set up your API key:\n' +
      '1. Get your API key from https://platform.openai.com/api-keys\n' +
      '2. Set it in your config file (.tdd-assistant.json):\n' +
      '   { "apiKey": "your-api-key-here" }\n' +
      '3. Or set the OPENAI_API_KEY environment variable\n'
    );
    this.name = 'APIKeyNotConfiguredError';
  }
}

/**
 * Error thrown when AI service is unavailable
 * Requirement: 5.4
 */
export class AIServiceUnavailableError extends Error {
  constructor(message: string) {
    super(`AI service is unavailable: ${message}`);
    this.name = 'AIServiceUnavailableError';
  }
}

/**
 * Prompt template for extracting test cases from user stories
 */
const TEST_EXTRACTION_PROMPT = `You are a test case extraction expert. Analyze the following user story and generate comprehensive test cases for a Java/Spring Boot application.

User Story:
Role: {role}
Feature: {feature}
Benefit: {benefit}
{acceptanceCriteria}

Generate test cases that cover:
1. Happy path scenarios (normal successful operations)
2. Error conditions (what can go wrong)
3. Edge cases (boundary conditions, empty inputs, etc.)
4. Boundary conditions (limits, thresholds)

For each test case, provide:
- name: A descriptive test method name in camelCase (e.g., shouldReturnUserWhenValidIdProvided)
- description: A brief description of what the test validates
- type: One of "happy_path", "error", "edge_case", or "boundary"
- assertions: List of assertions to verify (e.g., "response status is 200", "user name matches input")
- mockDependencies: List of dependencies that need to be mocked (e.g., "UserRepository", "EmailService")

Respond with a JSON array of test cases. Example format:
[
  {
    "name": "shouldReturnUserWhenValidIdProvided",
    "description": "Verify that a user is returned when a valid ID is provided",
    "type": "happy_path",
    "assertions": ["response status is 200", "returned user ID matches requested ID"],
    "mockDependencies": ["UserRepository"]
  }
]

Generate at least one test case for each acceptance criterion if provided. Ensure comprehensive coverage.`;

/**
 * Build the prompt with user story details
 */
function buildPrompt(story: UserStory): string {
  let acceptanceCriteriaText = '';
  if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
    acceptanceCriteriaText = '\nAcceptance Criteria:\n' + 
      story.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
  }

  return TEST_EXTRACTION_PROMPT
    .replace('{role}', story.role)
    .replace('{feature}', story.feature)
    .replace('{benefit}', story.benefit)
    .replace('{acceptanceCriteria}', acceptanceCriteriaText);
}


// Re-export extraction utilities from test-case-extractor
export { 
  extractTestCases, 
  categorizeTestCases, 
  checkCoverage,
  ExtractionResult 
} from './test-case-extractor';

import { extractTestCases as extractTestCasesFromResponse } from './test-case-extractor';

/**
 * Parse and validate test cases from AI response
 * Requirement: 2.2, 2.4, 5.5
 */
export function parseTestCasesFromResponse(responseText: string): TestCase[] {
  const result = extractTestCasesFromResponse(responseText);
  
  if (result.testCases.length === 0 && result.warnings.length > 0) {
    throw new Error(`Failed to parse AI response: ${result.warnings.join(', ')}`);
  }
  
  return result.testCases;
}

/**
 * Configuration for OpenAI service
 */
export interface OpenAIServiceConfig {
  apiKey?: string;
  model?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_SERVICE_CONFIG: Required<OpenAIServiceConfig> = {
  apiKey: '',
  model: 'gpt-4',
  maxRetries: 3,
  retryDelayMs: 1000
};

/**
 * OpenAI Service implementation
 * Requirement: 5.1, 5.3
 */
export class OpenAIService implements AIService {
  private client: OpenAI | null = null;
  private config: Required<OpenAIServiceConfig>;

  constructor(config: OpenAIServiceConfig = {}) {
    this.config = {
      ...DEFAULT_SERVICE_CONFIG,
      ...config
    };
    
    // Try to get API key from environment if not provided
    if (!this.config.apiKey) {
      this.config.apiKey = process.env.OPENAI_API_KEY || '';
    }
    
    // Initialize client if API key is available
    if (this.config.apiKey) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey
      });
    }
  }

  /**
   * Check if the AI service is available
   * Requirement: 5.2, 5.4
   */
  async isAvailable(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    
    try {
      // Make a simple API call to check availability
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract test cases from a user story using OpenAI
   * Requirement: 5.1, 5.5
   */
  async extractTestCases(story: UserStory): Promise<TestCase[]> {
    if (!this.config.apiKey) {
      throw new APIKeyNotConfiguredError();
    }
    
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey
      });
    }

    const prompt = buildPrompt(story);
    
    let lastError: Error | null = null;
    
    // Retry logic with exponential backoff
    // Requirement: 5.4
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'You are a test case extraction expert. Always respond with valid JSON arrays.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        });

        const content = response.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('Empty response from AI');
        }
        
        return parseTestCasesFromResponse(content);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if it's a rate limit error
        if (error instanceof OpenAI.RateLimitError) {
          // Wait with exponential backoff before retrying
          const delay = this.config.retryDelayMs * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }
        
        // Check if it's an API error
        if (error instanceof OpenAI.APIError) {
          if (error.status === 401) {
            throw new APIKeyNotConfiguredError();
          }
          if (error.status && error.status >= 500) {
            // Server error, retry
            const delay = this.config.retryDelayMs * Math.pow(2, attempt);
            await this.sleep(delay);
            continue;
          }
        }
        
        // For other errors, throw immediately
        throw new AIServiceUnavailableError(lastError.message);
      }
    }
    
    // All retries exhausted
    throw new AIServiceUnavailableError(
      `Failed after ${this.config.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the configured model
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Update the API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey: this.config.apiKey
    });
  }
}

/**
 * Factory function to create an AIService instance
 */
export function createAIService(config?: OpenAIServiceConfig): AIService {
  return new OpenAIService(config);
}

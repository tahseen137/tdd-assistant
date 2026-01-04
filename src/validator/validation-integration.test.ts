/**
 * Integration Tests for End-to-End Validation
 * 
 * Tests the complete validation flow: story + code → validation report
 * Uses mock AI responses to test the integration without external dependencies
 * 
 * Validates: Requirements 8.1, 8.7
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createStoryParser, UserStory } from '../parser/story-parser';
import { createCodeAnalyzer, CodeAnalyzer } from './code-analyzer';
import { createCriteriaExtractor, CriteriaExtractor } from './criteria-extractor';
import { createCriteriaMatcher, CriteriaMatcher } from './criteria-matcher';
import { 
  createValidationReporter, 
  createValidationReport, 
  ValidationReporter 
} from './validation-reporter';
import {
  AcceptanceCriterion,
  CriterionMatch,
  CodeStructure,
  SourceFile,
  ValidationReport
} from './types';

// Mock OpenAI module
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

describe('Integration Tests: End-to-End Validation Flow', () => {
  // Validates: Requirements 8.1, 8.7
  
  let tempDir: string;
  let storyParser: ReturnType<typeof createStoryParser>;
  let codeAnalyzer: CodeAnalyzer;
  let reporter: ValidationReporter;

  beforeAll(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdd-assistant-test-'));
  });

  afterAll(() => {
    // Clean up temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    storyParser = createStoryParser();
    codeAnalyzer = createCodeAnalyzer();
    reporter = createValidationReporter();
  });

  /**
   * Helper function to create a test Java file
   */
  function createTestJavaFile(filename: string, content: string): string {
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Helper function to create mock criteria from a user story
   */
  function createMockCriteria(story: UserStory): AcceptanceCriterion[] {
    const criteria: AcceptanceCriterion[] = [];
    
    // Generate criteria based on story content
    if (story.feature) {
      criteria.push({
        id: 'AC-1',
        description: `User can successfully ${story.feature}`,
        type: 'happy_path',
        keywords: story.feature.toLowerCase().split(' ').filter(w => w.length > 3)
      });
    }
    
    criteria.push({
      id: 'AC-2',
      description: 'System handles errors gracefully',
      type: 'error',
      keywords: ['error', 'handle', 'gracefully']
    });
    
    criteria.push({
      id: 'AC-3',
      description: 'System validates input before processing',
      type: 'functional',
      keywords: ['validate', 'input', 'processing']
    });
    
    return criteria;
  }

  /**
   * Helper function to create mock criterion matches
   */
  function createMockMatches(
    criteria: AcceptanceCriterion[],
    codeStructures: CodeStructure[],
    sourceFiles: SourceFile[]
  ): CriterionMatch[] {
    return criteria.map((criterion, index) => {
      // Simulate different coverage statuses based on index
      if (index === 0) {
        return {
          criterion,
          status: 'covered' as const,
          evidence: [{
            filePath: sourceFiles[0]?.path || 'unknown',
            className: codeStructures[0]?.classes[0]?.name,
            methodName: codeStructures[0]?.classes[0]?.methods[0]?.name,
            lineNumbers: { start: 10, end: 20 },
            snippet: 'public void login() { ... }',
            explanation: 'Method implements the required functionality'
          }],
          confidence: 85
        };
      } else if (index === 1) {
        return {
          criterion,
          status: 'partially_covered' as const,
          evidence: [{
            filePath: sourceFiles[0]?.path || 'unknown',
            lineNumbers: { start: 25, end: 30 },
            snippet: 'try { ... } catch (Exception e) { ... }',
            explanation: 'Basic error handling exists but could be improved'
          }],
          confidence: 50,
          suggestions: ['Add more specific exception handling', 'Log errors for debugging']
        };
      } else {
        return {
          criterion,
          status: 'not_covered' as const,
          evidence: [],
          confidence: 0,
          suggestions: ['Implement input validation', 'Add validation annotations']
        };
      }
    });
  }

  describe('Complete validation flow with mock AI', () => {
    /**
     * Test: Story parsing → Code analysis → Criteria extraction → Matching → Report generation
     * Validates: Requirements 8.1, 8.7
     */
    it('should complete full validation flow from story to report', async () => {
      // Step 1: Create a user story
      const storyText = 'As a user, I want to login to the system, so that I can access my account';
      const userStory = storyParser.parse(storyText);
      
      expect(userStory.role).toBe('user');
      expect(userStory.feature).toBe('login to the system');
      expect(userStory.benefit).toBe('I can access my account');
      
      // Step 2: Create test Java code
      const javaCode = `
package com.example.auth;

import org.springframework.stereotype.Service;

@Service
public class AuthService {
    
    public boolean login(String username, String password) {
        if (username == null || password == null) {
            throw new IllegalArgumentException("Credentials cannot be null");
        }
        // Authentication logic
        return authenticate(username, password);
    }
    
    private boolean authenticate(String username, String password) {
        // Actual authentication implementation
        return true;
    }
    
    public void handleError(Exception e) {
        // Error handling
        System.err.println("Error: " + e.getMessage());
    }
}
`;
      const javaFilePath = createTestJavaFile('AuthService.java', javaCode);
      
      // Step 3: Analyze the code
      const sourceFile = await codeAnalyzer.analyzeFile(javaFilePath);
      expect(sourceFile.language).toBe('java');
      expect(sourceFile.content).toContain('AuthService');
      
      const codeStructure = codeAnalyzer.extractStructure(sourceFile);
      expect(codeStructure.classes.length).toBeGreaterThan(0);
      expect(codeStructure.classes[0].name).toBe('AuthService');
      
      // Step 4: Create mock criteria (simulating AI extraction)
      const criteria = createMockCriteria(userStory);
      expect(criteria.length).toBeGreaterThan(0);
      
      // Step 5: Create mock matches (simulating AI matching)
      const matches = createMockMatches(criteria, [codeStructure], [sourceFile]);
      expect(matches.length).toBe(criteria.length);
      
      // Step 6: Generate validation report
      const report = createValidationReport(
        {
          role: userStory.role,
          feature: userStory.feature,
          benefit: userStory.benefit,
          totalCriteria: criteria.length
        },
        matches
      );
      
      // Verify report structure
      expect(report.story.role).toBe('user');
      expect(report.story.feature).toBe('login to the system');
      expect(report.criteria.length).toBe(3);
      expect(report.summary.totalCriteria).toBe(3);
      expect(report.summary.covered).toBe(1);
      expect(report.summary.partiallyCovered).toBe(1);
      expect(report.summary.notCovered).toBe(1);
      
      // Verify coverage percentage: (1 + 0.5 * 1) / 3 * 100 = 50%
      expect(report.summary.coveragePercentage).toBe(50);
      expect(report.summary.overallStatus).toBe('partial');
    });

    /**
     * Test: Report generation in different formats
     * Validates: Requirements 8.7, 9.1, 9.2, 9.3
     */
    it('should generate reports in all supported formats', async () => {
      // Create a simple validation report
      const storyText = 'As a developer, I want to validate code, so that I can ensure quality';
      const userStory = storyParser.parse(storyText);
      
      const criteria = createMockCriteria(userStory);
      
      // Create mock source file and structure for matches
      const mockSourceFile: SourceFile = {
        path: '/test/Service.java',
        content: 'public class Service {}',
        language: 'java'
      };
      
      const mockCodeStructure: CodeStructure = {
        filePath: '/test/Service.java',
        language: 'java',
        classes: [{
          name: 'Service',
          methods: [],
          fields: [],
          annotations: [],
          lineStart: 1,
          lineEnd: 1
        }],
        methods: [],
        imports: [],
        annotations: []
      };
      
      const matches = createMockMatches(criteria, [mockCodeStructure], [mockSourceFile]);
      
      const report = createValidationReport(
        {
          role: userStory.role,
          feature: userStory.feature,
          benefit: userStory.benefit,
          totalCriteria: criteria.length
        },
        matches
      );
      
      // Test console format
      const consoleOutput = reporter.generate(report, 'console');
      expect(consoleOutput).toContain('VALIDATION REPORT');
      expect(consoleOutput).toContain('developer');
      expect(consoleOutput).toContain('validate code');
      expect(consoleOutput).toContain('Coverage');
      
      // Test JSON format
      const jsonOutput = reporter.generate(report, 'json');
      const parsedJson = JSON.parse(jsonOutput);
      expect(parsedJson.story.role).toBe('developer');
      expect(parsedJson.summary.totalCriteria).toBe(3);
      expect(parsedJson.criteria).toHaveLength(3);
      
      // Test Markdown format
      const markdownOutput = reporter.generate(report, 'markdown');
      expect(markdownOutput).toContain('# Validation Report');
      expect(markdownOutput).toContain('## Story Summary');
      expect(markdownOutput).toContain('## Coverage Summary');
      expect(markdownOutput).toContain('## Criteria Details');
    });

    /**
     * Test: Validation with multiple source files
     * Validates: Requirements 8.3, 8.7
     */
    it('should handle validation with multiple source files', async () => {
      // Create multiple Java files
      const serviceCode = `
package com.example.service;

public class UserService {
    public void createUser(String name) {
        // Create user logic
    }
}
`;
      const controllerCode = `
package com.example.controller;

import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {
    public String getUser(Long id) {
        return "user";
    }
}
`;
      
      const serviceFile = createTestJavaFile('UserService.java', serviceCode);
      const controllerFile = createTestJavaFile('UserController.java', controllerCode);
      
      // Analyze both files
      const sourceFiles = [
        await codeAnalyzer.analyzeFile(serviceFile),
        await codeAnalyzer.analyzeFile(controllerFile)
      ];
      
      expect(sourceFiles.length).toBe(2);
      
      const codeStructures = sourceFiles.map(sf => codeAnalyzer.extractStructure(sf));
      expect(codeStructures.length).toBe(2);
      expect(codeStructures[0].classes[0].name).toBe('UserService');
      expect(codeStructures[1].classes[0].name).toBe('UserController');
      
      // Create story and criteria
      const storyText = 'As an admin, I want to manage users, so that I can control access';
      const userStory = storyParser.parse(storyText);
      const criteria = createMockCriteria(userStory);
      
      // Create matches using multiple files
      const matches = createMockMatches(criteria, codeStructures, sourceFiles);
      
      const report = createValidationReport(
        {
          role: userStory.role,
          feature: userStory.feature,
          benefit: userStory.benefit,
          totalCriteria: criteria.length
        },
        matches
      );
      
      // Verify report
      expect(report.story.role).toBe('admin');
      expect(report.criteria.length).toBe(3);
      expect(report.summary.totalCriteria).toBe(3);
    });

    /**
     * Test: Validation with TypeScript files
     * Validates: Requirements 8.3, 8.5
     */
    it('should handle validation with TypeScript source files', async () => {
      // Create a TypeScript file
      const tsCode = `
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async login(username: string, password: string): Promise<boolean> {
    // Login implementation
    return true;
  }
  
  async validateToken(token: string): Promise<boolean> {
    // Token validation
    return token.length > 0;
  }
}
`;
      const tsFilePath = createTestJavaFile('auth.service.ts', tsCode);
      
      // Analyze the TypeScript file
      const sourceFile = await codeAnalyzer.analyzeFile(tsFilePath);
      expect(sourceFile.language).toBe('typescript');
      
      const codeStructure = codeAnalyzer.extractStructure(sourceFile);
      expect(codeStructure.classes.length).toBeGreaterThan(0);
      expect(codeStructure.classes[0].name).toBe('AuthService');
      
      // Create story and validate
      const storyText = 'As a user, I want to authenticate, so that I can access protected resources';
      const userStory = storyParser.parse(storyText);
      const criteria = createMockCriteria(userStory);
      const matches = createMockMatches(criteria, [codeStructure], [sourceFile]);
      
      const report = createValidationReport(
        {
          role: userStory.role,
          feature: userStory.feature,
          benefit: userStory.benefit,
          totalCriteria: criteria.length
        },
        matches
      );
      
      expect(report.story.feature).toBe('authenticate');
      expect(report.criteria.length).toBe(3);
    });

    /**
     * Test: Report file output
     * Validates: Requirements 9.4
     */
    it('should write validation report to file', async () => {
      const storyText = 'As a tester, I want to save reports, so that I can review them later';
      const userStory = storyParser.parse(storyText);
      const criteria = createMockCriteria(userStory);
      
      const mockSourceFile: SourceFile = {
        path: '/test/Test.java',
        content: 'public class Test {}',
        language: 'java'
      };
      
      const mockCodeStructure: CodeStructure = {
        filePath: '/test/Test.java',
        language: 'java',
        classes: [],
        methods: [],
        imports: [],
        annotations: []
      };
      
      const matches = createMockMatches(criteria, [mockCodeStructure], [mockSourceFile]);
      
      const report = createValidationReport(
        {
          role: userStory.role,
          feature: userStory.feature,
          benefit: userStory.benefit,
          totalCriteria: criteria.length
        },
        matches
      );
      
      // Write JSON report to file
      const jsonReportPath = path.join(tempDir, 'report.json');
      await reporter.writeToFile(report, jsonReportPath, 'json');
      
      expect(fs.existsSync(jsonReportPath)).toBe(true);
      const jsonContent = fs.readFileSync(jsonReportPath, 'utf-8');
      const parsedReport = JSON.parse(jsonContent);
      expect(parsedReport.story.role).toBe('tester');
      
      // Write Markdown report to file
      const mdReportPath = path.join(tempDir, 'report.md');
      await reporter.writeToFile(report, mdReportPath, 'markdown');
      
      expect(fs.existsSync(mdReportPath)).toBe(true);
      const mdContent = fs.readFileSync(mdReportPath, 'utf-8');
      expect(mdContent).toContain('# Validation Report');
    });
  });

  describe('Edge cases and error handling', () => {
    /**
     * Test: Validation with empty criteria
     * Validates: Requirements 8.7
     */
    it('should handle validation with no criteria', () => {
      const report = createValidationReport(
        {
          role: 'user',
          feature: 'do something',
          benefit: 'achieve goal',
          totalCriteria: 0
        },
        []
      );
      
      expect(report.criteria.length).toBe(0);
      expect(report.summary.totalCriteria).toBe(0);
      expect(report.summary.covered).toBe(0);
      expect(report.summary.partiallyCovered).toBe(0);
      expect(report.summary.notCovered).toBe(0);
      expect(report.summary.coveragePercentage).toBe(0);
      // When there are no criteria, the status is 'pass' (vacuously true - nothing to fail)
      expect(report.summary.overallStatus).toBe('pass');
    });

    /**
     * Test: Validation with all criteria covered
     * Validates: Requirements 8.7, 8.8
     */
    it('should report pass status when all criteria are covered', () => {
      const criteria: AcceptanceCriterion[] = [
        { id: 'AC-1', description: 'Test 1', type: 'happy_path', keywords: ['test'] },
        { id: 'AC-2', description: 'Test 2', type: 'functional', keywords: ['test'] }
      ];
      
      const matches: CriterionMatch[] = criteria.map(criterion => ({
        criterion,
        status: 'covered' as const,
        evidence: [{
          filePath: '/test.java',
          lineNumbers: { start: 1, end: 10 },
          snippet: 'code',
          explanation: 'Implemented'
        }],
        confidence: 90
      }));
      
      const report = createValidationReport(
        { role: 'user', feature: 'test', benefit: 'benefit', totalCriteria: 2 },
        matches
      );
      
      expect(report.summary.overallStatus).toBe('pass');
      expect(report.summary.coveragePercentage).toBe(100);
    });

    /**
     * Test: Validation with all criteria not covered
     * Validates: Requirements 8.7, 8.10
     */
    it('should report fail status when no criteria are covered', () => {
      const criteria: AcceptanceCriterion[] = [
        { id: 'AC-1', description: 'Test 1', type: 'happy_path', keywords: ['test'] },
        { id: 'AC-2', description: 'Test 2', type: 'functional', keywords: ['test'] }
      ];
      
      const matches: CriterionMatch[] = criteria.map(criterion => ({
        criterion,
        status: 'not_covered' as const,
        evidence: [],
        confidence: 0,
        suggestions: ['Implement this feature']
      }));
      
      const report = createValidationReport(
        { role: 'user', feature: 'test', benefit: 'benefit', totalCriteria: 2 },
        matches
      );
      
      expect(report.summary.overallStatus).toBe('fail');
      expect(report.summary.coveragePercentage).toBe(0);
    });

    /**
     * Test: Story parsing with incomplete format
     * Validates: Requirements 8.1
     */
    it('should handle incomplete user story format', () => {
      const incompleteStory = 'I want to login';
      const userStory = storyParser.parse(incompleteStory);
      
      // Parser should still return a UserStory object
      expect(userStory.rawText).toBe(incompleteStory);
      
      // Validation should indicate missing parts
      const validation = storyParser.validate(userStory);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    /**
     * Test: Code analysis with unsupported file type
     * Validates: Requirements 8.3
     */
    it('should reject unsupported file types', async () => {
      const unsupportedFile = createTestJavaFile('config.xml', '<config></config>');
      
      await expect(codeAnalyzer.analyzeFile(unsupportedFile))
        .rejects.toThrow('Unsupported file type');
    });

    /**
     * Test: Code analysis with non-existent file
     * Validates: Requirements 8.3
     */
    it('should handle non-existent files gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.java');
      
      await expect(codeAnalyzer.analyzeFile(nonExistentPath))
        .rejects.toThrow('File not found');
    });
  });

  describe('Report consistency validation', () => {
    /**
     * Test: Report summary consistency
     * Validates: Requirements 8.7, 8.11
     */
    it('should maintain consistency between criteria array and summary', () => {
      const criteria: AcceptanceCriterion[] = [
        { id: 'AC-1', description: 'Test 1', type: 'happy_path', keywords: [] },
        { id: 'AC-2', description: 'Test 2', type: 'error', keywords: [] },
        { id: 'AC-3', description: 'Test 3', type: 'edge_case', keywords: [] },
        { id: 'AC-4', description: 'Test 4', type: 'boundary', keywords: [] },
        { id: 'AC-5', description: 'Test 5', type: 'functional', keywords: [] }
      ];
      
      const matches: CriterionMatch[] = [
        { criterion: criteria[0], status: 'covered', evidence: [{ filePath: 'f', lineNumbers: { start: 1, end: 2 }, snippet: 's', explanation: 'e' }], confidence: 100 },
        { criterion: criteria[1], status: 'covered', evidence: [{ filePath: 'f', lineNumbers: { start: 1, end: 2 }, snippet: 's', explanation: 'e' }], confidence: 90 },
        { criterion: criteria[2], status: 'partially_covered', evidence: [{ filePath: 'f', lineNumbers: { start: 1, end: 2 }, snippet: 's', explanation: 'e' }], confidence: 50, suggestions: ['s'] },
        { criterion: criteria[3], status: 'partially_covered', evidence: [{ filePath: 'f', lineNumbers: { start: 1, end: 2 }, snippet: 's', explanation: 'e' }], confidence: 40, suggestions: ['s'] },
        { criterion: criteria[4], status: 'not_covered', evidence: [], confidence: 0, suggestions: ['Implement'] }
      ];
      
      const report = createValidationReport(
        { role: 'user', feature: 'test', benefit: 'benefit', totalCriteria: 5 },
        matches
      );
      
      // Verify counts
      expect(report.summary.totalCriteria).toBe(5);
      expect(report.summary.covered).toBe(2);
      expect(report.summary.partiallyCovered).toBe(2);
      expect(report.summary.notCovered).toBe(1);
      
      // Verify sum equals total
      const sum = report.summary.covered + report.summary.partiallyCovered + report.summary.notCovered;
      expect(sum).toBe(report.summary.totalCriteria);
      
      // Verify coverage percentage: (2 + 0.5 * 2) / 5 * 100 = 60%
      expect(report.summary.coveragePercentage).toBe(60);
      
      // Verify overall status
      expect(report.summary.overallStatus).toBe('partial');
    });
  });
});

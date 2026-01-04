/**
 * Interactive Mode Tests
 * Tests for interactive test case selection functionality
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import * as fc from 'fast-check';
import { TestCase, TestCaseType } from '../ai/openai-service';
import {
  SelectableTestCase,
  toSelectableTestCases,
  toSelectedTestCases,
  formatTestCaseDisplay,
  parseToggleCommand,
  parseEditCommand,
  validateTestCaseName,
  filterSelectedTestCases,
  applyNameEdits
} from './index';

// Helper to create a test case
function createTestCase(
  name: string,
  description: string,
  type: TestCaseType = 'happy_path'
): TestCase {
  return {
    name,
    description,
    type,
    assertions: ['assertion1'],
    mockDependencies: []
  };
}

describe('Interactive Mode', () => {
  describe('toSelectableTestCases', () => {
    it('should convert test cases to selectable with all selected by default', () => {
      const testCases: TestCase[] = [
        createTestCase('test1', 'Test 1'),
        createTestCase('test2', 'Test 2')
      ];
      
      const result = toSelectableTestCases(testCases);
      
      expect(result).toHaveLength(2);
      expect(result[0].selected).toBe(true);
      expect(result[1].selected).toBe(true);
      expect(result[0].originalName).toBe('test1');
      expect(result[1].originalName).toBe('test2');
    });
    
    it('should preserve all original test case properties', () => {
      const testCase: TestCase = {
        name: 'testMethod',
        description: 'A test description',
        type: 'edge_case',
        assertions: ['assert1', 'assert2'],
        mockDependencies: ['MockService']
      };
      
      const result = toSelectableTestCases([testCase]);
      
      expect(result[0].name).toBe('testMethod');
      expect(result[0].description).toBe('A test description');
      expect(result[0].type).toBe('edge_case');
      expect(result[0].assertions).toEqual(['assert1', 'assert2']);
      expect(result[0].mockDependencies).toEqual(['MockService']);
    });
  });
  
  describe('toSelectedTestCases', () => {
    it('should return only selected test cases', () => {
      const selectableTestCases: SelectableTestCase[] = [
        { ...createTestCase('test1', 'Test 1'), selected: true, originalName: 'test1' },
        { ...createTestCase('test2', 'Test 2'), selected: false, originalName: 'test2' },
        { ...createTestCase('test3', 'Test 3'), selected: true, originalName: 'test3' }
      ];
      
      const result = toSelectedTestCases(selectableTestCases);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test1');
      expect(result[1].name).toBe('test3');
    });
    
    it('should remove selected and originalName properties', () => {
      const selectableTestCases: SelectableTestCase[] = [
        { ...createTestCase('test1', 'Test 1'), selected: true, originalName: 'test1' }
      ];
      
      const result = toSelectedTestCases(selectableTestCases);
      
      expect(result[0]).not.toHaveProperty('selected');
      expect(result[0]).not.toHaveProperty('originalName');
    });
  });
  
  describe('formatTestCaseDisplay', () => {
    it('should format selected test case with checkbox', () => {
      const testCase: SelectableTestCase = {
        ...createTestCase('shouldDoSomething', 'Should do something when called'),
        selected: true,
        originalName: 'shouldDoSomething'
      };
      
      const result = formatTestCaseDisplay(testCase, 0);
      
      expect(result).toContain('[x]');
      expect(result).toContain('1.');
      expect(result).toContain('shouldDoSomething');
      expect(result).toContain('Should do something when called');
    });
    
    it('should format unselected test case with empty checkbox', () => {
      const testCase: SelectableTestCase = {
        ...createTestCase('testMethod', 'Test description'),
        selected: false,
        originalName: 'testMethod'
      };
      
      const result = formatTestCaseDisplay(testCase, 2);
      
      expect(result).toContain('[ ]');
      expect(result).toContain('3.');
    });
    
    it('should format test type with spaces instead of underscores', () => {
      const testCase: SelectableTestCase = {
        ...createTestCase('test', 'desc', 'edge_case'),
        selected: true,
        originalName: 'test'
      };
      
      const result = formatTestCaseDisplay(testCase, 0);
      
      expect(result).toContain('edge case');
    });
  });
  
  describe('parseToggleCommand', () => {
    it('should parse valid toggle command', () => {
      expect(parseToggleCommand('toggle 1', 5)).toBe(0);
      expect(parseToggleCommand('toggle 3', 5)).toBe(2);
      expect(parseToggleCommand('TOGGLE 2', 5)).toBe(1);
    });
    
    it('should return -1 for invalid commands', () => {
      expect(parseToggleCommand('toggle', 5)).toBe(-1);
      expect(parseToggleCommand('toggle abc', 5)).toBe(-1);
      expect(parseToggleCommand('toggle 0', 5)).toBe(-1);
      expect(parseToggleCommand('toggle 6', 5)).toBe(-1);
      expect(parseToggleCommand('invalid', 5)).toBe(-1);
    });
  });
  
  describe('parseEditCommand', () => {
    it('should parse valid edit command', () => {
      expect(parseEditCommand('edit 1', 5)).toBe(0);
      expect(parseEditCommand('edit 3', 5)).toBe(2);
      expect(parseEditCommand('EDIT 2', 5)).toBe(1);
    });
    
    it('should return -1 for invalid commands', () => {
      expect(parseEditCommand('edit', 5)).toBe(-1);
      expect(parseEditCommand('edit abc', 5)).toBe(-1);
      expect(parseEditCommand('edit 0', 5)).toBe(-1);
      expect(parseEditCommand('edit 6', 5)).toBe(-1);
    });
  });
  
  describe('validateTestCaseName', () => {
    it('should accept valid Java method names', () => {
      expect(validateTestCaseName('testMethod')).toBeNull();
      expect(validateTestCaseName('shouldDoSomething')).toBeNull();
      expect(validateTestCaseName('test_with_underscore')).toBeNull();
      expect(validateTestCaseName('testMethod123')).toBeNull();
    });
    
    it('should reject empty names', () => {
      expect(validateTestCaseName('')).not.toBeNull();
      expect(validateTestCaseName('   ')).not.toBeNull();
    });
    
    it('should reject names starting with numbers', () => {
      expect(validateTestCaseName('123test')).not.toBeNull();
    });
    
    it('should reject names with special characters', () => {
      expect(validateTestCaseName('test-method')).not.toBeNull();
      expect(validateTestCaseName('test.method')).not.toBeNull();
      expect(validateTestCaseName('test method')).not.toBeNull();
    });
  });
  
  describe('filterSelectedTestCases', () => {
    it('should return test cases at specified indices', () => {
      const testCases: TestCase[] = [
        createTestCase('test0', 'Test 0'),
        createTestCase('test1', 'Test 1'),
        createTestCase('test2', 'Test 2'),
        createTestCase('test3', 'Test 3')
      ];
      
      const result = filterSelectedTestCases(testCases, [0, 2]);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test0');
      expect(result[1].name).toBe('test2');
    });
    
    it('should ignore invalid indices', () => {
      const testCases: TestCase[] = [
        createTestCase('test0', 'Test 0'),
        createTestCase('test1', 'Test 1')
      ];
      
      const result = filterSelectedTestCases(testCases, [-1, 0, 5, 1, 100]);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test0');
      expect(result[1].name).toBe('test1');
    });
    
    it('should return empty array for empty selection', () => {
      const testCases: TestCase[] = [
        createTestCase('test0', 'Test 0')
      ];
      
      const result = filterSelectedTestCases(testCases, []);
      
      expect(result).toHaveLength(0);
    });
  });
  
  describe('applyNameEdits', () => {
    it('should apply name edits to specified test cases', () => {
      const testCases: TestCase[] = [
        createTestCase('test0', 'Test 0'),
        createTestCase('test1', 'Test 1'),
        createTestCase('test2', 'Test 2')
      ];
      
      const edits = new Map<number, string>();
      edits.set(0, 'newName0');
      edits.set(2, 'newName2');
      
      const result = applyNameEdits(testCases, edits);
      
      expect(result[0].name).toBe('newName0');
      expect(result[1].name).toBe('test1');
      expect(result[2].name).toBe('newName2');
    });
    
    it('should not modify original test cases', () => {
      const testCases: TestCase[] = [
        createTestCase('original', 'Test')
      ];
      
      const edits = new Map<number, string>();
      edits.set(0, 'modified');
      
      applyNameEdits(testCases, edits);
      
      expect(testCases[0].name).toBe('original');
    });
  });
});


/**
 * Property-Based Tests for Interactive Mode
 * 
 * Feature: tdd-assistant, Property 9: Selected Test Case Generation
 * Validates: Requirements 7.4
 */
describe('Property-Based Tests', () => {
  // Arbitrary for generating valid test case types
  const testCaseTypeArb = fc.constantFrom<TestCaseType>(
    'happy_path', 'error', 'edge_case', 'boundary'
  );
  
  // Arbitrary for generating valid Java method names
  const javaMethodNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/);
  
  // Arbitrary for generating test cases
  const testCaseArb = fc.record({
    name: javaMethodNameArb,
    description: fc.string({ minLength: 1, maxLength: 100 }),
    type: testCaseTypeArb,
    assertions: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
    mockDependencies: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 3 })
  });
  
  // Arbitrary for generating arrays of test cases
  const testCasesArb = fc.array(testCaseArb, { minLength: 1, maxLength: 20 });
  
  /**
   * Property 9: Selected Test Case Generation
   * For any selection of N test cases in interactive mode, 
   * the generated output should contain exactly N test methods.
   * 
   * Feature: tdd-assistant, Property 9: Selected Test Case Generation
   * Validates: Requirements 7.4
   */
  describe('Property 9: Selected Test Case Generation', () => {
    it('should generate exactly N test cases when N are selected', () => {
      fc.assert(
        fc.property(
          testCasesArb,
          fc.array(fc.boolean()),
          (testCases, selectionFlags) => {
            // Create selection flags for each test case
            const flags = testCases.map((_, i) => 
              i < selectionFlags.length ? selectionFlags[i] : true
            );
            
            // Get indices of selected test cases
            const selectedIndices = flags
              .map((selected, index) => selected ? index : -1)
              .filter(index => index >= 0);
            
            // Filter test cases based on selection
            const result = filterSelectedTestCases(testCases, selectedIndices);
            
            // Property: output count should equal selection count
            return result.length === selectedIndices.length;
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should preserve test case content when selected', () => {
      fc.assert(
        fc.property(
          testCasesArb,
          (testCases) => {
            // Select all test cases
            const allIndices = testCases.map((_, i) => i);
            const result = filterSelectedTestCases(testCases, allIndices);
            
            // Property: all selected test cases should have their content preserved
            return result.every((tc, i) => 
              tc.name === testCases[i].name &&
              tc.description === testCases[i].description &&
              tc.type === testCases[i].type
            );
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should return empty array when no test cases are selected', () => {
      fc.assert(
        fc.property(
          testCasesArb,
          (testCases) => {
            // Select no test cases
            const result = filterSelectedTestCases(testCases, []);
            
            // Property: empty selection should produce empty output
            return result.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should maintain order of selected test cases', () => {
      fc.assert(
        fc.property(
          testCasesArb,
          (testCases) => {
            // Select test cases in order
            const indices = testCases.map((_, i) => i).filter((_, i) => i % 2 === 0);
            const result = filterSelectedTestCases(testCases, indices);
            
            // Property: result should maintain the order of indices
            return result.every((tc, resultIndex) => {
              const originalIndex = indices[resultIndex];
              return tc.name === testCases[originalIndex].name;
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Additional property tests for interactive mode functions
   */
  describe('toSelectableTestCases and toSelectedTestCases round-trip', () => {
    it('should preserve all test cases when all are selected', () => {
      fc.assert(
        fc.property(
          testCasesArb,
          (testCases) => {
            // Convert to selectable (all selected by default)
            const selectable = toSelectableTestCases(testCases);
            
            // Convert back to regular test cases
            const result = toSelectedTestCases(selectable);
            
            // Property: round-trip should preserve all test cases
            return result.length === testCases.length &&
              result.every((tc, i) => 
                tc.name === testCases[i].name &&
                tc.description === testCases[i].description
              );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('validateTestCaseName', () => {
    it('should accept all valid Java method names', () => {
      fc.assert(
        fc.property(
          javaMethodNameArb,
          (name) => {
            // Property: valid Java method names should pass validation
            return validateTestCaseName(name) === null;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

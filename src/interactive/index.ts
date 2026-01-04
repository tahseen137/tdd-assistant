/**
 * Interactive Mode Module
 * Handles interactive test case selection and editing
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import * as readline from 'readline';
import { TestCase } from '../ai/openai-service';

/**
 * Selection state for a test case
 */
export interface SelectableTestCase extends TestCase {
  selected: boolean;
  originalName: string;
}

/**
 * Result of interactive selection
 */
export interface InteractiveSelectionResult {
  selectedTestCases: TestCase[];
  cancelled: boolean;
}

/**
 * Interactive session interface
 */
export interface InteractiveSession {
  displayTestCases(testCases: TestCase[]): void;
  selectTestCases(testCases: TestCase[]): Promise<InteractiveSelectionResult>;
  close(): void;
}

/**
 * Creates a readline interface for user input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompts user for input and returns the response
 */
async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Formats a test case for display
 * Requirement: 7.1
 */
export function formatTestCaseDisplay(testCase: SelectableTestCase, index: number): string {
  const checkbox = testCase.selected ? '[x]' : '[ ]';
  const typeLabel = testCase.type.replace('_', ' ');
  return `${checkbox} ${index + 1}. ${testCase.name}\n    Type: ${typeLabel}\n    Description: ${testCase.description}`;
}

/**
 * Displays all test cases with their selection status
 * Requirement: 7.1
 */
export function displayAllTestCases(testCases: SelectableTestCase[]): void {
  console.log('\n=== Proposed Test Cases ===\n');
  
  for (let i = 0; i < testCases.length; i++) {
    console.log(formatTestCaseDisplay(testCases[i], i));
    console.log('');
  }
  
  console.log('=== Commands ===');
  console.log('  toggle <number>  - Select/deselect a test case (e.g., "toggle 1")');
  console.log('  edit <number>    - Edit test case name (e.g., "edit 1")');
  console.log('  all              - Select all test cases');
  console.log('  none             - Deselect all test cases');
  console.log('  done             - Generate selected test cases');
  console.log('  cancel           - Cancel and exit');
  console.log('');
}

/**
 * Converts TestCase array to SelectableTestCase array
 * All test cases are selected by default
 */
export function toSelectableTestCases(testCases: TestCase[]): SelectableTestCase[] {
  return testCases.map(tc => ({
    ...tc,
    selected: true,
    originalName: tc.name
  }));
}

/**
 * Converts SelectableTestCase array back to TestCase array (selected only)
 * Requirement: 7.4
 */
export function toSelectedTestCases(selectableTestCases: SelectableTestCase[]): TestCase[] {
  return selectableTestCases
    .filter(tc => tc.selected)
    .map(({ selected, originalName, ...testCase }) => testCase);
}


/**
 * Parses a toggle command and returns the index
 * Returns -1 if invalid
 */
export function parseToggleCommand(input: string, maxIndex: number): number {
  const match = input.match(/^toggle\s+(\d+)$/i);
  if (!match) return -1;
  
  const index = parseInt(match[1], 10) - 1; // Convert to 0-based
  if (index < 0 || index >= maxIndex) return -1;
  
  return index;
}

/**
 * Parses an edit command and returns the index
 * Returns -1 if invalid
 */
export function parseEditCommand(input: string, maxIndex: number): number {
  const match = input.match(/^edit\s+(\d+)$/i);
  if (!match) return -1;
  
  const index = parseInt(match[1], 10) - 1; // Convert to 0-based
  if (index < 0 || index >= maxIndex) return -1;
  
  return index;
}

/**
 * Validates a new test case name
 * Returns error message if invalid, null if valid
 */
export function validateTestCaseName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Test case name cannot be empty';
  }
  
  // Check for valid Java method name (starts with letter, contains only alphanumeric and underscore)
  const trimmed = name.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmed)) {
    return 'Test case name must be a valid Java method name (start with letter, alphanumeric and underscore only)';
  }
  
  return null;
}

/**
 * Interactive session implementation
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export class InteractiveSessionImpl implements InteractiveSession {
  private rl: readline.Interface | null = null;
  
  /**
   * Displays proposed test cases
   * Requirement: 7.1
   */
  displayTestCases(testCases: TestCase[]): void {
    const selectable = toSelectableTestCases(testCases);
    displayAllTestCases(selectable);
  }
  
  /**
   * Runs the interactive selection loop
   * Requirements: 7.1, 7.2, 7.3, 7.4
   */
  async selectTestCases(testCases: TestCase[]): Promise<InteractiveSelectionResult> {
    this.rl = createReadlineInterface();
    const selectableTestCases = toSelectableTestCases(testCases);
    
    try {
      // Initial display
      displayAllTestCases(selectableTestCases);
      
      // Main interaction loop
      while (true) {
        const input = await prompt(this.rl, 'Enter command: ');
        const command = input.toLowerCase();
        
        if (command === 'done') {
          const selected = toSelectedTestCases(selectableTestCases);
          if (selected.length === 0) {
            console.log('\nNo test cases selected. Please select at least one test case or cancel.\n');
            continue;
          }
          console.log(`\nGenerating ${selected.length} test case(s)...\n`);
          return { selectedTestCases: selected, cancelled: false };
        }
        
        if (command === 'cancel') {
          console.log('\nCancelled.\n');
          return { selectedTestCases: [], cancelled: true };
        }
        
        if (command === 'all') {
          selectableTestCases.forEach(tc => tc.selected = true);
          console.log('\nAll test cases selected.\n');
          displayAllTestCases(selectableTestCases);
          continue;
        }
        
        if (command === 'none') {
          selectableTestCases.forEach(tc => tc.selected = false);
          console.log('\nAll test cases deselected.\n');
          displayAllTestCases(selectableTestCases);
          continue;
        }
        
        // Handle toggle command
        // Requirement: 7.2
        const toggleIndex = parseToggleCommand(input, selectableTestCases.length);
        if (toggleIndex >= 0) {
          selectableTestCases[toggleIndex].selected = !selectableTestCases[toggleIndex].selected;
          const status = selectableTestCases[toggleIndex].selected ? 'selected' : 'deselected';
          console.log(`\nTest case ${toggleIndex + 1} ${status}.\n`);
          displayAllTestCases(selectableTestCases);
          continue;
        }
        
        // Handle edit command
        // Requirement: 7.3
        const editIndex = parseEditCommand(input, selectableTestCases.length);
        if (editIndex >= 0) {
          const currentName = selectableTestCases[editIndex].name;
          console.log(`\nCurrent name: ${currentName}`);
          const newName = await prompt(this.rl, 'Enter new name (or press Enter to keep current): ');
          
          if (newName) {
            const validationError = validateTestCaseName(newName);
            if (validationError) {
              console.log(`\nError: ${validationError}\n`);
            } else {
              selectableTestCases[editIndex].name = newName.trim();
              console.log(`\nTest case name updated to: ${newName.trim()}\n`);
            }
          } else {
            console.log('\nName unchanged.\n');
          }
          displayAllTestCases(selectableTestCases);
          continue;
        }
        
        // Unknown command
        console.log('\nUnknown command. Available commands: toggle <n>, edit <n>, all, none, done, cancel\n');
      }
    } finally {
      this.close();
    }
  }
  
  /**
   * Closes the readline interface
   */
  close(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

/**
 * Factory function to create an InteractiveSession
 */
export function createInteractiveSession(): InteractiveSession {
  return new InteractiveSessionImpl();
}

/**
 * Filters test cases based on selection
 * This is the core function for Property 9
 * Requirement: 7.4
 */
export function filterSelectedTestCases(
  testCases: TestCase[],
  selectedIndices: number[]
): TestCase[] {
  // Validate indices
  const validIndices = selectedIndices.filter(
    i => i >= 0 && i < testCases.length
  );
  
  // Return only selected test cases
  return validIndices.map(i => testCases[i]);
}

/**
 * Applies name edits to test cases
 * Requirement: 7.3
 */
export function applyNameEdits(
  testCases: TestCase[],
  edits: Map<number, string>
): TestCase[] {
  return testCases.map((tc, index) => {
    const newName = edits.get(index);
    if (newName !== undefined) {
      return { ...tc, name: newName };
    }
    return tc;
  });
}

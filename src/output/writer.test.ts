/**
 * Property-Based Tests for Output File Path Correctness
 * 
 * Feature: tdd-assistant, Property 6: Output File Path Correctness
 * Validates: Requirements 3.6
 * 
 * Property 6: For any valid output directory and package name, the generated test file
 * should be written to {outputDir}/{packagePath}/{ClassName}.java where packagePath
 * is the package name with dots replaced by directory separators.
 */

import * as fc from 'fast-check';
import * as path from 'path';
import {
  packageToPath,
  constructFilePath,
  DefaultOutputWriter,
  createOutputWriter
} from './writer';
import { GeneratedTest } from '../generator/java-generator';

// Arbitrary for valid Java package name segments (lowercase letters only)
const packageSegmentArb = fc.stringOf(
  fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'),
  { minLength: 1, maxLength: 10 }
);

// Arbitrary for valid Java package names (e.g., "com.example.myapp")
const packageNameArb = fc.array(packageSegmentArb, { minLength: 1, maxLength: 5 })
  .map(segments => segments.join('.'));

// Arbitrary for valid directory path segments
const dirSegmentArb = fc.stringOf(
  fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '_'),
  { minLength: 1, maxLength: 15 }
);

// Arbitrary for valid output directory paths
const outputDirectoryArb = fc.array(dirSegmentArb, { minLength: 1, maxLength: 4 })
  .map(segments => segments.join(path.sep));

// Arbitrary for valid Java class names (PascalCase, ending with Test)
const classNameArb = fc.tuple(
  fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'),
  fc.stringOf(
    fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'),
    { minLength: 2, maxLength: 15 }
  )
).map(([first, rest]) => `${first}${rest}Test`);

// Arbitrary for GeneratedTest objects
const generatedTestArb = fc.tuple(
  classNameArb,
  packageNameArb
).map(([className, packageName]): GeneratedTest => ({
  className,
  packageName,
  imports: ['org.junit.jupiter.api.Test'],
  testMethods: [],
  sourceCode: `package ${packageName};\n\nclass ${className} {}`
}));

describe('Property 6: Output File Path Correctness', () => {
  // Feature: tdd-assistant, Property 6: Output File Path Correctness
  // Validates: Requirements 3.6

  /**
   * Property: packageToPath should replace all dots with directory separators
   */
  it('should convert package name dots to directory separators', () => {
    fc.assert(
      fc.property(
        packageNameArb,
        (packageName) => {
          const result = packageToPath(packageName);
          
          // Result should not contain any dots
          expect(result).not.toContain('.');
          
          // Number of separators should equal number of dots in original
          const dotCount = (packageName.match(/\./g) || []).length;
          const sepCount = result.split(path.sep).length - 1;
          expect(sepCount).toBe(dotCount);
          
          // Segments should be preserved
          const originalSegments = packageName.split('.');
          const resultSegments = result.split(path.sep);
          expect(resultSegments).toEqual(originalSegments);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: constructFilePath should produce path in format {outputDir}/{packagePath}/{ClassName}.java
   */
  it('should construct file path with correct structure', () => {
    fc.assert(
      fc.property(
        outputDirectoryArb,
        packageNameArb,
        classNameArb,
        (outputDir, packageName, className) => {
          const result = constructFilePath(outputDir, packageName, className);
          
          // Path should start with output directory
          expect(result.startsWith(outputDir)).toBe(true);
          
          // Path should end with .java
          expect(result.endsWith('.java')).toBe(true);
          
          // Path should contain the class name
          expect(result).toContain(className);
          
          // Path should contain package path segments
          const packageSegments = packageName.split('.');
          for (const segment of packageSegments) {
            expect(result).toContain(segment);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: File path should be deterministic - same inputs always produce same path
   */
  it('should be deterministic - same inputs always produce same path', () => {
    fc.assert(
      fc.property(
        outputDirectoryArb,
        packageNameArb,
        classNameArb,
        (outputDir, packageName, className) => {
          const result1 = constructFilePath(outputDir, packageName, className);
          const result2 = constructFilePath(outputDir, packageName, className);
          
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: File path should correctly combine all components
   */
  it('should correctly combine outputDir, packagePath, and className', () => {
    fc.assert(
      fc.property(
        outputDirectoryArb,
        packageNameArb,
        classNameArb,
        (outputDir, packageName, className) => {
          const result = constructFilePath(outputDir, packageName, className);
          const packagePath = packageToPath(packageName);
          const expectedPath = path.join(outputDir, packagePath, `${className}.java`);
          
          expect(result).toBe(expectedPath);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Class name with .java extension should not be duplicated
   */
  it('should not duplicate .java extension if already present', () => {
    fc.assert(
      fc.property(
        outputDirectoryArb,
        packageNameArb,
        classNameArb,
        (outputDir, packageName, className) => {
          const classNameWithExt = `${className}.java`;
          const result = constructFilePath(outputDir, packageName, classNameWithExt);
          
          // Should not have double .java extension
          expect(result).not.toContain('.java.java');
          expect(result.endsWith('.java')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('OutputWriter', () => {
  /**
   * Unit test: createOutputWriter should return a valid OutputWriter instance
   */
  it('should create a valid OutputWriter instance', () => {
    const writer = createOutputWriter();
    
    expect(writer).toBeDefined();
    expect(typeof writer.writeToFile).toBe('function');
    expect(typeof writer.writeToStdout).toBe('function');
    expect(typeof writer.writeMultipleToFiles).toBe('function');
  });

  /**
   * Unit test: DefaultOutputWriter should implement OutputWriter interface
   */
  it('should implement OutputWriter interface correctly', () => {
    const writer = new DefaultOutputWriter();
    
    expect(writer).toBeInstanceOf(DefaultOutputWriter);
    expect(typeof writer.writeToFile).toBe('function');
    expect(typeof writer.writeToStdout).toBe('function');
    expect(typeof writer.writeMultipleToFiles).toBe('function');
  });
});

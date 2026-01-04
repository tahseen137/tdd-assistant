/**
 * Output Writer
 * Writes generated tests to files or stdout
 * 
 * Requirements: 3.6, 3.7, 6.4
 */

import * as fs from 'fs';
import * as path from 'path';
import { GeneratedTest } from '../generator/java-generator';

export interface OutputWriter {
  writeToFile(test: GeneratedTest, directory: string): Promise<string>;
  writeToStdout(test: GeneratedTest): void;
  writeMultipleToFiles(tests: GeneratedTest[], directory: string): Promise<string[]>;
}

/**
 * Converts a Java package name to a directory path
 * e.g., "com.example.myapp" -> "com/example/myapp"
 * 
 * Requirement: 3.6
 */
export function packageToPath(packageName: string): string {
  return packageName.replace(/\./g, path.sep);
}

/**
 * Constructs the full file path for a generated test
 * Format: {outputDir}/{packagePath}/{ClassName}.java
 * 
 * Requirement: 3.6
 */
export function constructFilePath(
  outputDirectory: string,
  packageName: string,
  className: string
): string {
  const packagePath = packageToPath(packageName);
  const fileName = className.endsWith('.java') ? className : `${className}.java`;
  return path.join(outputDirectory, packagePath, fileName);
}

/**
 * Creates directories recursively if they don't exist
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * Default OutputWriter implementation
 */
export class DefaultOutputWriter implements OutputWriter {
  /**
   * Writes a generated test to a file
   * Creates directories if they don't exist
   * 
   * Requirements: 3.6
   */
  async writeToFile(test: GeneratedTest, directory: string): Promise<string> {
    const filePath = constructFilePath(directory, test.packageName, test.className);
    const dirPath = path.dirname(filePath);
    
    // Create directories if they don't exist
    await ensureDirectoryExists(dirPath);
    
    // Write the file
    await fs.promises.writeFile(filePath, test.sourceCode, 'utf-8');
    
    return filePath;
  }
  
  /**
   * Writes a generated test to stdout
   * 
   * Requirement: 3.7
   */
  writeToStdout(test: GeneratedTest): void {
    console.log(test.sourceCode);
  }
  
  /**
   * Writes multiple test classes to separate files
   * 
   * Requirement: 6.4
   */
  async writeMultipleToFiles(
    tests: GeneratedTest[],
    directory: string
  ): Promise<string[]> {
    const writtenPaths: string[] = [];
    
    for (const test of tests) {
      const filePath = await this.writeToFile(test, directory);
      writtenPaths.push(filePath);
    }
    
    return writtenPaths;
  }
}

/**
 * Factory function to create an OutputWriter instance
 */
export function createOutputWriter(): OutputWriter {
  return new DefaultOutputWriter();
}

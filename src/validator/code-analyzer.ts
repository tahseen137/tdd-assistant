/**
 * Code Analyzer
 * Analyzes source code files to extract structure and logic
 * 
 * Requirements: 8.3, 8.5
 */

import { SourceFile, CodeStructure, SourceLanguage } from './types';

/**
 * Interface for the Code Analyzer
 */
export interface CodeAnalyzer {
  /**
   * Analyze a single source file
   */
  analyzeFile(filePath: string): Promise<SourceFile>;
  
  /**
   * Analyze all source files in a directory
   */
  analyzeDirectory(dirPath: string, recursive: boolean): Promise<SourceFile[]>;
  
  /**
   * Extract code structure from a source file
   */
  extractStructure(source: SourceFile): CodeStructure;
}

/**
 * Factory function to create a CodeAnalyzer instance
 * Implementation will be added in Task 2
 */
export function createCodeAnalyzer(): CodeAnalyzer {
  // Placeholder - implementation in Task 2
  throw new Error('Not implemented yet');
}

/**
 * Detect the language of a source file based on extension
 */
export function detectLanguage(filePath: string): SourceLanguage | null {
  const ext = filePath.toLowerCase().split('.').pop();
  
  switch (ext) {
    case 'java':
      return 'java';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    default:
      return null;
  }
}

/**
 * Check if a file is a supported source file
 */
export function isSupportedSourceFile(filePath: string): boolean {
  return detectLanguage(filePath) !== null;
}

/**
 * Supported file extensions
 */
export const SUPPORTED_EXTENSIONS = ['.java', '.ts', '.tsx', '.js', '.jsx'];

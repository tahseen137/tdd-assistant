/**
 * Code Analyzer
 * Analyzes source code files to extract structure and logic
 * 
 * Requirements: 8.3, 8.5
 */

import * as fs from 'fs';
import * as path from 'path';
import { SourceFile, CodeStructure, SourceLanguage, ClassInfo, MethodInfo } from './types';

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
 * Supported file extensions
 */
export const SUPPORTED_EXTENSIONS = ['.java', '.ts', '.tsx', '.js', '.jsx'];

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
 * Default implementation of CodeAnalyzer
 */
class DefaultCodeAnalyzer implements CodeAnalyzer {
  /**
   * Analyze a single source file
   */
  async analyzeFile(filePath: string): Promise<SourceFile> {
    const resolvedPath = path.resolve(filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const language = detectLanguage(filePath);
    if (!language) {
      throw new Error(`Unsupported file type: ${filePath}`);
    }
    
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    
    return {
      path: resolvedPath,
      content,
      language
    };
  }
  
  /**
   * Analyze all source files in a directory
   */
  async analyzeDirectory(dirPath: string, recursive: boolean): Promise<SourceFile[]> {
    const resolvedPath = path.resolve(dirPath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }
    
    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      // If it's a file, analyze it directly
      if (isSupportedSourceFile(resolvedPath)) {
        return [await this.analyzeFile(resolvedPath)];
      }
      return [];
    }
    
    const sourceFiles: SourceFile[] = [];
    await this.scanDirectory(resolvedPath, recursive, sourceFiles);
    
    return sourceFiles;
  }
  
  /**
   * Recursively scan a directory for source files
   */
  private async scanDirectory(
    dirPath: string, 
    recursive: boolean, 
    results: SourceFile[]
  ): Promise<void> {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip common non-source directories
        if (this.shouldSkipDirectory(entry.name)) {
          continue;
        }
        
        if (recursive) {
          await this.scanDirectory(fullPath, recursive, results);
        }
      } else if (entry.isFile() && isSupportedSourceFile(fullPath)) {
        try {
          const sourceFile = await this.analyzeFile(fullPath);
          results.push(sourceFile);
        } catch (error) {
          // Log warning but continue with other files
          console.warn(`Warning: Could not analyze file ${fullPath}: ${error}`);
        }
      }
    }
  }
  
  /**
   * Check if a directory should be skipped during scanning
   */
  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', 'target', 
      '.idea', '.vscode', '__pycache__', '.gradle', 'bin', 'out'
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }
  
  /**
   * Extract code structure from a source file
   */
  extractStructure(source: SourceFile): CodeStructure {
    switch (source.language) {
      case 'java':
        return this.extractJavaStructure(source);
      case 'typescript':
      case 'javascript':
        return this.extractTypeScriptStructure(source);
      default:
        return this.createEmptyStructure(source);
    }
  }
  
  /**
   * Extract structure from Java source file
   */
  private extractJavaStructure(source: SourceFile): CodeStructure {
    const lines = source.content.split('\n');
    const imports: string[] = [];
    const classes: ClassInfo[] = [];
    const annotations: string[] = [];
    
    // Extract imports
    const importRegex = /^import\s+(?:static\s+)?([^;]+);/;
    for (const line of lines) {
      const match = line.trim().match(importRegex);
      if (match) {
        imports.push(match[1].trim());
      }
    }
    
    // Extract class-level annotations
    const classAnnotationRegex = /^@(\w+)(?:\([^)]*\))?/;
    
    // Extract classes and methods
    const classRegex = /(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+(\w+)/;
    const methodRegex = /(?:public|private|protected)\s*(?:static|final|abstract|synchronized)?\s*(?:<[^>]+>\s*)?([A-Za-z_][\w<>,\s]*)\s+(\w+)\s*\(([^)]*)\)/;
    const annotationRegex = /@(\w+)(?:\([^)]*\))?/g;
    
    let currentClass: ClassInfo | null = null;
    let braceCount = 0;
    let inClass = false;
    let methodStartLine = 0;
    let currentMethod: Partial<MethodInfo> | null = null;
    let methodBraceCount = 0;
    let methodBody: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Count braces
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      
      // Check for class declaration
      const classMatch = trimmedLine.match(classRegex);
      if (classMatch && !inClass) {
        // Extract annotations before class
        const classAnnotations: string[] = [];
        for (let j = i - 1; j >= 0 && j >= i - 5; j--) {
          const prevLine = lines[j].trim();
          if (prevLine.startsWith('@')) {
            const annMatch = prevLine.match(classAnnotationRegex);
            if (annMatch) {
              classAnnotations.unshift(annMatch[1]);
            }
          } else if (prevLine && !prevLine.startsWith('//') && !prevLine.startsWith('/*')) {
            break;
          }
        }
        
        currentClass = {
          name: classMatch[1],
          methods: [],
          fields: [],
          annotations: classAnnotations,
          lineStart: i + 1,
          lineEnd: i + 1
        };
        inClass = true;
        braceCount = openBraces - closeBraces;
        continue;
      }
      
      if (inClass && currentClass) {
        braceCount += openBraces - closeBraces;
        
        // Check for method declaration
        const methodMatch = trimmedLine.match(methodRegex);
        if (methodMatch && !currentMethod) {
          // Extract method annotations
          const methodAnnotations: string[] = [];
          for (let j = i - 1; j >= 0 && j >= i - 5; j--) {
            const prevLine = lines[j].trim();
            if (prevLine.startsWith('@')) {
              let annMatch;
              while ((annMatch = annotationRegex.exec(prevLine)) !== null) {
                methodAnnotations.unshift(annMatch[1]);
              }
            } else if (prevLine && !prevLine.startsWith('//') && !prevLine.startsWith('/*')) {
              break;
            }
          }
          
          currentMethod = {
            returnType: methodMatch[1],
            name: methodMatch[2],
            parameters: methodMatch[3] ? methodMatch[3].split(',').map(p => p.trim()) : [],
            annotations: methodAnnotations,
            lineStart: i + 1
          };
          methodStartLine = i;
          methodBraceCount = openBraces - closeBraces;
          methodBody = [line];
        } else if (currentMethod) {
          methodBraceCount += openBraces - closeBraces;
          methodBody.push(line);
          
          if (methodBraceCount <= 0) {
            // Method ended
            const method: MethodInfo = {
              name: currentMethod.name!,
              returnType: currentMethod.returnType!,
              parameters: currentMethod.parameters!,
              annotations: currentMethod.annotations!,
              body: methodBody.join('\n'),
              lineStart: currentMethod.lineStart!,
              lineEnd: i + 1
            };
            currentClass.methods.push(method);
            currentMethod = null;
            methodBody = [];
          }
        }
        
        // Check if class ended
        if (braceCount <= 0) {
          currentClass.lineEnd = i + 1;
          classes.push(currentClass);
          annotations.push(...currentClass.annotations);
          currentClass = null;
          inClass = false;
        }
      }
    }
    
    // Extract standalone methods (for top-level functions)
    const standaloneMethods: MethodInfo[] = [];
    
    return {
      filePath: source.path,
      language: source.language,
      classes,
      methods: standaloneMethods,
      imports,
      annotations
    };
  }
  
  /**
   * Extract structure from TypeScript/JavaScript source file
   */
  private extractTypeScriptStructure(source: SourceFile): CodeStructure {
    const lines = source.content.split('\n');
    const imports: string[] = [];
    const classes: ClassInfo[] = [];
    const methods: MethodInfo[] = [];
    const annotations: string[] = [];
    
    // Extract imports
    const importRegex = /^import\s+(?:{[^}]+}|[\w*]+)\s+from\s+['"]([^'"]+)['"]/;
    const requireRegex = /(?:const|let|var)\s+(?:{[^}]+}|\w+)\s*=\s*require\s*\(['"]([^'"]+)['"]\)/;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      const importMatch = trimmedLine.match(importRegex);
      if (importMatch) {
        imports.push(importMatch[1]);
        continue;
      }
      const requireMatch = trimmedLine.match(requireRegex);
      if (requireMatch) {
        imports.push(requireMatch[1]);
      }
    }
    
    // Extract classes
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/;
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)/;
    const arrowFunctionRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/;
    
    let currentClass: ClassInfo | null = null;
    let braceCount = 0;
    let inClass = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      
      // Check for class declaration
      const classMatch = trimmedLine.match(classRegex);
      if (classMatch && !inClass) {
        currentClass = {
          name: classMatch[1],
          methods: [],
          fields: [],
          annotations: [],
          lineStart: i + 1,
          lineEnd: i + 1
        };
        inClass = true;
        braceCount = openBraces - closeBraces;
        continue;
      }
      
      if (inClass && currentClass) {
        braceCount += openBraces - closeBraces;
        
        if (braceCount <= 0) {
          currentClass.lineEnd = i + 1;
          classes.push(currentClass);
          currentClass = null;
          inClass = false;
        }
      }
      
      // Check for standalone functions
      if (!inClass) {
        const funcMatch = trimmedLine.match(functionRegex);
        if (funcMatch) {
          methods.push({
            name: funcMatch[1],
            parameters: funcMatch[2] ? funcMatch[2].split(',').map(p => p.trim()) : [],
            returnType: 'unknown',
            body: '',
            annotations: [],
            lineStart: i + 1,
            lineEnd: i + 1
          });
        }
        
        const arrowMatch = trimmedLine.match(arrowFunctionRegex);
        if (arrowMatch) {
          methods.push({
            name: arrowMatch[1],
            parameters: [],
            returnType: 'unknown',
            body: '',
            annotations: [],
            lineStart: i + 1,
            lineEnd: i + 1
          });
        }
      }
    }
    
    return {
      filePath: source.path,
      language: source.language,
      classes,
      methods,
      imports,
      annotations
    };
  }
  
  /**
   * Create an empty structure for unsupported languages
   */
  private createEmptyStructure(source: SourceFile): CodeStructure {
    return {
      filePath: source.path,
      language: source.language,
      classes: [],
      methods: [],
      imports: [],
      annotations: []
    };
  }
}

/**
 * Factory function to create a CodeAnalyzer instance
 */
export function createCodeAnalyzer(): CodeAnalyzer {
  return new DefaultCodeAnalyzer();
}

/**
 * Code Analyzer Tests
 * 
 * Requirements: 8.3, 8.5
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createCodeAnalyzer,
  detectLanguage,
  isSupportedSourceFile,
  SUPPORTED_EXTENSIONS
} from './code-analyzer';

describe('Code Analyzer', () => {
  let tempDir: string;
  
  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-analyzer-test-'));
  });
  
  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  
  describe('detectLanguage', () => {
    it('should detect Java files', () => {
      expect(detectLanguage('MyClass.java')).toBe('java');
      expect(detectLanguage('path/to/MyClass.java')).toBe('java');
    });
    
    it('should detect TypeScript files', () => {
      expect(detectLanguage('index.ts')).toBe('typescript');
      expect(detectLanguage('Component.tsx')).toBe('typescript');
    });
    
    it('should detect JavaScript files', () => {
      expect(detectLanguage('script.js')).toBe('javascript');
      expect(detectLanguage('Component.jsx')).toBe('javascript');
    });
    
    it('should return null for unsupported files', () => {
      expect(detectLanguage('file.txt')).toBeNull();
      expect(detectLanguage('file.py')).toBeNull();
      expect(detectLanguage('file.css')).toBeNull();
    });
  });
  
  describe('isSupportedSourceFile', () => {
    it('should return true for supported files', () => {
      expect(isSupportedSourceFile('file.java')).toBe(true);
      expect(isSupportedSourceFile('file.ts')).toBe(true);
      expect(isSupportedSourceFile('file.js')).toBe(true);
    });
    
    it('should return false for unsupported files', () => {
      expect(isSupportedSourceFile('file.txt')).toBe(false);
      expect(isSupportedSourceFile('file.md')).toBe(false);
    });
  });
  
  describe('analyzeFile', () => {
    it('should analyze a Java file', async () => {
      const javaContent = `
package com.example;

import java.util.List;

public class MyClass {
    public void myMethod() {
        System.out.println("Hello");
    }
}
`;
      const filePath = path.join(tempDir, 'MyClass.java');
      fs.writeFileSync(filePath, javaContent);
      
      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(filePath);
      
      expect(result.language).toBe('java');
      expect(result.content).toBe(javaContent);
      expect(result.path).toBe(filePath);
    });
    
    it('should analyze a TypeScript file', async () => {
      const tsContent = `
import { Something } from './something';

export class MyClass {
    myMethod(): void {
        console.log("Hello");
    }
}
`;
      const filePath = path.join(tempDir, 'MyClass.ts');
      fs.writeFileSync(filePath, tsContent);
      
      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(filePath);
      
      expect(result.language).toBe('typescript');
      expect(result.content).toBe(tsContent);
    });
    
    it('should throw error for non-existent file', async () => {
      const analyzer = createCodeAnalyzer();
      
      await expect(analyzer.analyzeFile('/non/existent/file.java'))
        .rejects.toThrow('File not found');
    });
    
    it('should throw error for unsupported file type', async () => {
      const filePath = path.join(tempDir, 'file.txt');
      fs.writeFileSync(filePath, 'some content');
      
      const analyzer = createCodeAnalyzer();
      
      await expect(analyzer.analyzeFile(filePath))
        .rejects.toThrow('Unsupported file type');
    });
  });
  
  describe('analyzeDirectory', () => {
    it('should find all source files in a directory', async () => {
      // Create test files
      fs.writeFileSync(path.join(tempDir, 'File1.java'), 'class File1 {}');
      fs.writeFileSync(path.join(tempDir, 'File2.ts'), 'class File2 {}');
      fs.writeFileSync(path.join(tempDir, 'readme.txt'), 'readme');
      
      const analyzer = createCodeAnalyzer();
      const results = await analyzer.analyzeDirectory(tempDir, false);
      
      expect(results.length).toBe(2);
      expect(results.map(r => path.basename(r.path)).sort()).toEqual(['File1.java', 'File2.ts']);
    });
    
    it('should recursively find files when recursive is true', async () => {
      // Create nested structure
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);
      
      fs.writeFileSync(path.join(tempDir, 'Root.java'), 'class Root {}');
      fs.writeFileSync(path.join(subDir, 'Nested.java'), 'class Nested {}');
      
      const analyzer = createCodeAnalyzer();
      const results = await analyzer.analyzeDirectory(tempDir, true);
      
      expect(results.length).toBe(2);
      expect(results.map(r => path.basename(r.path)).sort()).toEqual(['Nested.java', 'Root.java']);
    });
    
    it('should not recurse when recursive is false', async () => {
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);
      
      fs.writeFileSync(path.join(tempDir, 'Root.java'), 'class Root {}');
      fs.writeFileSync(path.join(subDir, 'Nested.java'), 'class Nested {}');
      
      const analyzer = createCodeAnalyzer();
      const results = await analyzer.analyzeDirectory(tempDir, false);
      
      expect(results.length).toBe(1);
      expect(path.basename(results[0].path)).toBe('Root.java');
    });
    
    it('should skip node_modules directory', async () => {
      const nodeModules = path.join(tempDir, 'node_modules');
      fs.mkdirSync(nodeModules);
      
      fs.writeFileSync(path.join(tempDir, 'App.ts'), 'class App {}');
      fs.writeFileSync(path.join(nodeModules, 'lib.js'), 'module.exports = {}');
      
      const analyzer = createCodeAnalyzer();
      const results = await analyzer.analyzeDirectory(tempDir, true);
      
      expect(results.length).toBe(1);
      expect(path.basename(results[0].path)).toBe('App.ts');
    });
    
    it('should throw error for non-existent directory', async () => {
      const analyzer = createCodeAnalyzer();
      
      await expect(analyzer.analyzeDirectory('/non/existent/dir', false))
        .rejects.toThrow('Directory not found');
    });
  });
  
  describe('extractStructure', () => {
    it('should extract Java class structure', async () => {
      const javaContent = `
package com.example;

import java.util.List;
import java.util.Map;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @GetMapping("/users")
    public List<User> getUsers() {
        return userRepository.findAll();
    }
    
    @PostMapping("/users")
    public User createUser(User user) {
        return userRepository.save(user);
    }
}
`;
      const filePath = path.join(tempDir, 'UserService.java');
      fs.writeFileSync(filePath, javaContent);
      
      const analyzer = createCodeAnalyzer();
      const sourceFile = await analyzer.analyzeFile(filePath);
      const structure = analyzer.extractStructure(sourceFile);
      
      expect(structure.language).toBe('java');
      expect(structure.imports).toContain('java.util.List');
      expect(structure.imports).toContain('java.util.Map');
      expect(structure.classes.length).toBe(1);
      expect(structure.classes[0].name).toBe('UserService');
      expect(structure.classes[0].annotations).toContain('Service');
      expect(structure.classes[0].methods.length).toBe(2);
      
      const getUsers = structure.classes[0].methods.find(m => m.name === 'getUsers');
      expect(getUsers).toBeDefined();
      expect(getUsers?.annotations).toContain('GetMapping');
      
      const createUser = structure.classes[0].methods.find(m => m.name === 'createUser');
      expect(createUser).toBeDefined();
      expect(createUser?.annotations).toContain('PostMapping');
    });
    
    it('should extract TypeScript class structure', async () => {
      const tsContent = `
import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
    constructor(private userRepository: UserRepository) {}
    
    async getUsers(): Promise<User[]> {
        return this.userRepository.findAll();
    }
}

export function helperFunction(param: string): void {
    console.log(param);
}
`;
      const filePath = path.join(tempDir, 'user.service.ts');
      fs.writeFileSync(filePath, tsContent);
      
      const analyzer = createCodeAnalyzer();
      const sourceFile = await analyzer.analyzeFile(filePath);
      const structure = analyzer.extractStructure(sourceFile);
      
      expect(structure.language).toBe('typescript');
      expect(structure.imports).toContain('@nestjs/common');
      expect(structure.imports).toContain('./user.repository');
      expect(structure.classes.length).toBe(1);
      expect(structure.classes[0].name).toBe('UserService');
      expect(structure.methods.length).toBeGreaterThanOrEqual(1);
      expect(structure.methods.find(m => m.name === 'helperFunction')).toBeDefined();
    });
  });
});

describe('SUPPORTED_EXTENSIONS', () => {
  it('should include all expected extensions', () => {
    expect(SUPPORTED_EXTENSIONS).toContain('.java');
    expect(SUPPORTED_EXTENSIONS).toContain('.ts');
    expect(SUPPORTED_EXTENSIONS).toContain('.tsx');
    expect(SUPPORTED_EXTENSIONS).toContain('.js');
    expect(SUPPORTED_EXTENSIONS).toContain('.jsx');
  });
});

/**
 * Property-Based Tests for Code Analyzer
 * 
 * Feature: tdd-assistant, Property 17: Recursive File Discovery
 * Validates: Requirements 8.3
 */
import * as fc from 'fast-check';

describe('Property-Based Tests: Recursive File Discovery', () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbt-code-analyzer-'));
  });
  
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  
  /**
   * Feature: tdd-assistant, Property 17: Recursive File Discovery
   * Validates: Requirements 8.3
   * 
   * For any directory path with the --recursive flag, the code analyzer should 
   * discover all source files matching supported extensions (.java, .ts, .js) 
   * in all subdirectories.
   */
  it('Property 17: should discover all source files in all subdirectories when recursive is true', async () => {
    // Arbitrary for generating valid file names (alphanumeric, starting with letter)
    const fileNameArb = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 10 })
      .map(s => s.charAt(0).toUpperCase() + s.slice(1));
    
    // Arbitrary for supported extensions
    const supportedExtArb = fc.constantFrom('.java', '.ts', '.js');
    
    // Arbitrary for unsupported extensions
    const unsupportedExtArb = fc.constantFrom('.txt', '.md', '.py', '.css', '.html');
    
    // Arbitrary for directory depth (1-3 levels)
    const depthArb = fc.integer({ min: 1, max: 3 });
    
    // Arbitrary for number of files per directory (0-3)
    const filesPerDirArb = fc.integer({ min: 0, max: 3 });
    
    // Arbitrary for directory structure
    const dirStructureArb = fc.record({
      depth: depthArb,
      filesPerLevel: fc.array(filesPerDirArb, { minLength: 1, maxLength: 4 }),
      supportedFiles: fc.array(
        fc.record({
          name: fileNameArb,
          ext: supportedExtArb,
          level: fc.integer({ min: 0, max: 3 })
        }),
        { minLength: 1, maxLength: 10 }
      ),
      unsupportedFiles: fc.array(
        fc.record({
          name: fileNameArb,
          ext: unsupportedExtArb,
          level: fc.integer({ min: 0, max: 3 })
        }),
        { minLength: 0, maxLength: 5 }
      )
    });
    
    await fc.assert(
      fc.asyncProperty(dirStructureArb, async (structure) => {
        // Create directory structure
        const createdDirs: string[] = [tempDir];
        const maxDepth = Math.min(structure.depth, 3);
        
        // Create nested directories
        let currentDir = tempDir;
        for (let i = 0; i < maxDepth; i++) {
          const subDir = path.join(currentDir, `level${i + 1}`);
          fs.mkdirSync(subDir, { recursive: true });
          createdDirs.push(subDir);
          currentDir = subDir;
        }
        
        // Track expected supported files
        const expectedSupportedFiles: string[] = [];
        
        // Create supported source files at various levels
        for (const file of structure.supportedFiles) {
          const level = Math.min(file.level, createdDirs.length - 1);
          const targetDir = createdDirs[level];
          const fileName = `${file.name}${file.ext}`;
          const filePath = path.join(targetDir, fileName);
          
          // Avoid duplicate file names in same directory
          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, `// ${fileName} content`);
            expectedSupportedFiles.push(filePath);
          }
        }
        
        // Create unsupported files (should be ignored)
        for (const file of structure.unsupportedFiles) {
          const level = Math.min(file.level, createdDirs.length - 1);
          const targetDir = createdDirs[level];
          const fileName = `${file.name}${file.ext}`;
          const filePath = path.join(targetDir, fileName);
          
          if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, `${fileName} content`);
          }
        }
        
        // Run the analyzer with recursive=true
        const analyzer = createCodeAnalyzer();
        const results = await analyzer.analyzeDirectory(tempDir, true);
        
        // Property: All discovered files should have supported extensions
        const allHaveSupportedExtensions = results.every(r => 
          isSupportedSourceFile(r.path)
        );
        
        // Property: All expected supported files should be discovered
        const discoveredPaths = new Set(results.map(r => r.path));
        const allExpectedFound = expectedSupportedFiles.every(f => 
          discoveredPaths.has(f)
        );
        
        // Property: No unsupported files should be discovered
        const noUnsupportedFiles = results.every(r => {
          const ext = path.extname(r.path).toLowerCase();
          return ['.java', '.ts', '.tsx', '.js', '.jsx'].includes(ext);
        });
        
        // Property: Number of discovered files should match expected supported files
        const countMatches = results.length === expectedSupportedFiles.length;
        
        // Clean up for next iteration
        for (let i = createdDirs.length - 1; i >= 1; i--) {
          fs.rmSync(createdDirs[i], { recursive: true, force: true });
        }
        // Clean root level files
        const rootEntries = fs.readdirSync(tempDir);
        for (const entry of rootEntries) {
          fs.rmSync(path.join(tempDir, entry), { recursive: true, force: true });
        }
        
        return allHaveSupportedExtensions && allExpectedFound && noUnsupportedFiles && countMatches;
      }),
      { numRuns: 100 }
    );
  });
  
  /**
   * Feature: tdd-assistant, Property 17: Recursive File Discovery (Non-recursive comparison)
   * Validates: Requirements 8.3
   * 
   * For any directory with subdirectories, recursive=true should find >= files than recursive=false
   */
  it('Property 17: recursive search should find at least as many files as non-recursive', async () => {
    const fileNameArb = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 8 })
      .map(s => s.charAt(0).toUpperCase() + s.slice(1));
    
    const extArb = fc.constantFrom('.java', '.ts', '.js');
    
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({ name: fileNameArb, ext: extArb }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.record({ name: fileNameArb, ext: extArb }), { minLength: 0, maxLength: 5 }),
        async (rootFiles, nestedFiles) => {
          // Create root level files
          const createdRootFiles: string[] = [];
          for (const file of rootFiles) {
            const fileName = `${file.name}${file.ext}`;
            const filePath = path.join(tempDir, fileName);
            if (!fs.existsSync(filePath)) {
              fs.writeFileSync(filePath, `// ${fileName}`);
              createdRootFiles.push(filePath);
            }
          }
          
          // Create nested directory with files
          const subDir = path.join(tempDir, 'nested');
          fs.mkdirSync(subDir, { recursive: true });
          
          const createdNestedFiles: string[] = [];
          for (const file of nestedFiles) {
            const fileName = `${file.name}${file.ext}`;
            const filePath = path.join(subDir, fileName);
            if (!fs.existsSync(filePath)) {
              fs.writeFileSync(filePath, `// ${fileName}`);
              createdNestedFiles.push(filePath);
            }
          }
          
          const analyzer = createCodeAnalyzer();
          
          const [nonRecursiveResults, recursiveResults] = await Promise.all([
            analyzer.analyzeDirectory(tempDir, false),
            analyzer.analyzeDirectory(tempDir, true)
          ]);
          
          // Clean up for next iteration
          fs.rmSync(subDir, { recursive: true, force: true });
          for (const filePath of createdRootFiles) {
            if (fs.existsSync(filePath)) {
              fs.rmSync(filePath);
            }
          }
          
          // Property: Recursive should find >= files than non-recursive
          return recursiveResults.length >= nonRecursiveResults.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});

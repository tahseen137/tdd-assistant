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

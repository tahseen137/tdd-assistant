/**
 * Code Formatter
 * Ensures consistent formatting for generated Java code
 * 
 * Requirements: 6.1, 6.2, 6.3
 */

/**
 * Configuration options for the code formatter
 */
export interface FormatterConfig {
  indentSize: number;
  indentChar: ' ' | '\t';
  maxLineLength?: number;
}

/**
 * Default formatter configuration
 * Requirement 6.1: 4-space indentation
 */
export const DEFAULT_FORMATTER_CONFIG: FormatterConfig = {
  indentSize: 4,
  indentChar: ' ',
  maxLineLength: 120
};

/**
 * Import categories for organizing imports
 * Requirement 6.3: Organize imports following Java conventions
 */
export enum ImportCategory {
  JAVA = 'java',
  JAVAX = 'javax',
  ORG = 'org',
  COM = 'com',
  STATIC = 'static',
  OTHER = 'other'
}

/**
 * Categorizes an import statement
 */
export function categorizeImport(importStatement: string): ImportCategory {
  const trimmed = importStatement.trim();
  
  if (trimmed.startsWith('static ')) {
    return ImportCategory.STATIC;
  }
  if (trimmed.startsWith('java.')) {
    return ImportCategory.JAVA;
  }
  if (trimmed.startsWith('javax.')) {
    return ImportCategory.JAVAX;
  }
  if (trimmed.startsWith('org.')) {
    return ImportCategory.ORG;
  }
  if (trimmed.startsWith('com.')) {
    return ImportCategory.COM;
  }
  return ImportCategory.OTHER;
}

/**
 * Organizes imports following Java conventions
 * Requirement 6.3: Organize imports at the top of the file
 * 
 * Order: java.* → javax.* → org.* → com.* → other → static
 */
export function organizeImports(imports: string[]): string[] {
  const categorized = new Map<ImportCategory, string[]>();
  
  // Initialize categories
  for (const category of Object.values(ImportCategory)) {
    categorized.set(category as ImportCategory, []);
  }
  
  // Categorize each import
  for (const imp of imports) {
    const category = categorizeImport(imp);
    categorized.get(category)!.push(imp);
  }
  
  // Sort within each category
  for (const [, imps] of categorized) {
    imps.sort((a, b) => a.localeCompare(b));
  }

  // Build result in order: java, javax, org, com, other, static
  const result: string[] = [];
  const order: ImportCategory[] = [
    ImportCategory.JAVA,
    ImportCategory.JAVAX,
    ImportCategory.ORG,
    ImportCategory.COM,
    ImportCategory.OTHER,
    ImportCategory.STATIC
  ];
  
  for (const category of order) {
    const categoryImports = categorized.get(category)!;
    if (categoryImports.length > 0) {
      result.push(...categoryImports);
    }
  }
  
  return result;
}

/**
 * Creates an indent string based on configuration
 */
export function createIndent(level: number, config: FormatterConfig = DEFAULT_FORMATTER_CONFIG): string {
  return config.indentChar.repeat(config.indentSize * level);
}

/**
 * Applies consistent indentation to code lines
 * Requirement 6.1: Apply consistent 4-space indentation
 */
export function applyIndentation(code: string, config: FormatterConfig = DEFAULT_FORMATTER_CONFIG): string {
  const lines = code.split('\n');
  const result: string[] = [];
  let indentLevel = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Decrease indent for closing braces
    if (trimmed.startsWith('}') || trimmed.startsWith(')')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    
    // Apply indentation
    if (trimmed.length > 0) {
      result.push(createIndent(indentLevel, config) + trimmed);
    } else {
      result.push('');
    }
    
    // Increase indent for opening braces
    if (trimmed.endsWith('{') || trimmed.endsWith('(')) {
      indentLevel++;
    }
  }
  
  return result.join('\n');
}

/**
 * Generates a descriptive comment block for a test method
 * Requirement 6.2: Add descriptive comments for each test method
 */
export function generateDescriptiveComment(
  description: string,
  testType: string,
  mockDependencies?: string[],
  assertions?: string[]
): string {
  const lines: string[] = [];
  lines.push('/**');
  lines.push(` * Test: ${description}`);
  lines.push(` * Type: ${testType}`);
  
  if (mockDependencies && mockDependencies.length > 0) {
    lines.push(` * Mocks: ${mockDependencies.join(', ')}`);
  }
  
  if (assertions && assertions.length > 0) {
    lines.push(' * Expected assertions:');
    for (const assertion of assertions) {
      lines.push(` *   - ${assertion}`);
    }
  }
  
  lines.push(' */');
  return lines.join('\n');
}

/**
 * Validates that imports are at the top of the file
 * Requirement 6.3: Imports should appear at the top
 */
export function validateImportsAtTop(code: string): boolean {
  const lines = code.split('\n');
  let foundPackage = false;
  let foundImport = false;
  let foundClass = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('package ')) {
      if (foundImport || foundClass) {
        return false; // Package should be before imports and class
      }
      foundPackage = true;
    } else if (trimmed.startsWith('import ')) {
      if (foundClass) {
        return false; // Imports should be before class
      }
      foundImport = true;
    } else if (trimmed.match(/^(public\s+)?(class|interface|enum)\s+/)) {
      foundClass = true;
    }
  }
  
  return true;
}

/**
 * Validates consistent indentation in code
 * Requirement 6.1: Consistent indentation
 * 
 * Note: Javadoc comment lines (starting with ' *') have base indentation + 1 space
 * for the asterisk alignment, which is standard Java formatting.
 */
export function validateIndentation(code: string, config: FormatterConfig = DEFAULT_FORMATTER_CONFIG): boolean {
  const lines = code.split('\n');
  const indentUnit = config.indentChar.repeat(config.indentSize);
  
  for (const line of lines) {
    if (line.length === 0) continue;
    
    // Count leading whitespace
    const leadingWhitespace = line.match(/^(\s*)/)?.[1] || '';
    
    // Skip if no indentation
    if (leadingWhitespace.length === 0) continue;
    
    // Get the trimmed content
    const trimmed = line.trim();
    
    // Special case: Javadoc comment lines (starting with '*')
    // These have base indentation + 1 space for asterisk alignment
    if (trimmed.startsWith('*') && !trimmed.startsWith('*/')) {
      // For Javadoc lines, indentation should be (multiple of 4) + 1
      const adjustedLength = leadingWhitespace.length - 1;
      if (adjustedLength >= 0 && adjustedLength % config.indentSize === 0) {
        continue;
      }
    }
    
    // Special case: closing Javadoc comment ' */'
    if (trimmed === '*/') {
      const adjustedLength = leadingWhitespace.length - 1;
      if (adjustedLength >= 0 && adjustedLength % config.indentSize === 0) {
        continue;
      }
    }
    
    // Check if indentation is a multiple of the indent unit
    if (leadingWhitespace.length % config.indentSize !== 0) {
      return false;
    }
    
    // Check if using correct indent character
    if (config.indentChar === ' ' && leadingWhitespace.includes('\t')) {
      return false;
    }
    if (config.indentChar === '\t' && leadingWhitespace.includes(' ')) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validates that each test method has a descriptive comment
 * Requirement 6.2: Include meaningful comments
 */
export function validateTestComments(code: string): boolean {
  const lines = code.split('\n');
  let expectingTest = false;
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // Check if this is a @Test annotation
    if (trimmed === '@Test') {
      // Look backwards for a comment block
      let foundComment = false;
      for (let j = i - 1; j >= 0 && j >= i - 10; j--) {
        const prevLine = lines[j].trim();
        if (prevLine === '*/') {
          foundComment = true;
          break;
        }
        if (prevLine.startsWith('@') && prevLine !== '@Test') {
          // Found another annotation, keep looking
          continue;
        }
        if (prevLine.length > 0 && !prevLine.startsWith('*') && !prevLine.startsWith('@')) {
          // Found non-comment, non-annotation content
          break;
        }
      }
      
      if (!foundComment) {
        return false;
      }
    }
  }
  
  return true;
}


/**
 * CodeFormatter class - main entry point for code formatting
 * Implements formatting requirements 6.1, 6.2, 6.3
 */
export class CodeFormatter {
  private config: FormatterConfig;
  
  constructor(config: FormatterConfig = DEFAULT_FORMATTER_CONFIG) {
    this.config = config;
  }
  
  /**
   * Formats Java source code with consistent styling
   * Requirements: 6.1, 6.2, 6.3
   */
  format(code: string): string {
    // Parse the code into sections
    const sections = this.parseCodeSections(code);
    
    // Reorganize imports
    if (sections.imports.length > 0) {
      sections.imports = organizeImports(sections.imports);
    }
    
    // Rebuild the code with proper formatting
    return this.rebuildCode(sections);
  }
  
  /**
   * Parses code into logical sections
   */
  private parseCodeSections(code: string): CodeSections {
    const lines = code.split('\n');
    const sections: CodeSections = {
      packageDeclaration: '',
      imports: [],
      classContent: []
    };
    
    let inClassContent = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('package ')) {
        sections.packageDeclaration = trimmed;
      } else if (trimmed.startsWith('import ')) {
        // Extract the import path (remove 'import ' and ';')
        const importPath = trimmed.replace(/^import\s+/, '').replace(/;$/, '');
        sections.imports.push(importPath);
      } else if (trimmed.match(/^(@\w+|class\s|public\s+class\s)/)) {
        inClassContent = true;
        sections.classContent.push(line);
      } else if (inClassContent || trimmed.length > 0) {
        if (inClassContent) {
          sections.classContent.push(line);
        }
      }
    }
    
    return sections;
  }
  
  /**
   * Rebuilds code from sections with proper formatting
   */
  private rebuildCode(sections: CodeSections): string {
    const lines: string[] = [];
    
    // Package declaration
    if (sections.packageDeclaration) {
      lines.push(sections.packageDeclaration);
      lines.push('');
    }
    
    // Imports (organized)
    if (sections.imports.length > 0) {
      let lastCategory: ImportCategory | null = null;
      
      for (const imp of sections.imports) {
        const category = categorizeImport(imp);
        
        // Add blank line between different categories
        if (lastCategory !== null && lastCategory !== category) {
          lines.push('');
        }
        
        if (imp.startsWith('static ')) {
          lines.push(`import ${imp};`);
        } else {
          lines.push(`import ${imp};`);
        }
        
        lastCategory = category;
      }
      lines.push('');
    }
    
    // Class content
    lines.push(...sections.classContent);
    
    return lines.join('\n');
  }
  
  /**
   * Validates that code meets all formatting requirements
   */
  validate(code: string): FormattingValidationResult {
    const errors: string[] = [];
    
    // Check imports at top
    if (!validateImportsAtTop(code)) {
      errors.push('Imports must appear at the top of the file, after the package declaration');
    }
    
    // Check indentation
    if (!validateIndentation(code, this.config)) {
      errors.push(`Indentation must be consistent (${this.config.indentSize} ${this.config.indentChar === ' ' ? 'spaces' : 'tabs'})`);
    }
    
    // Check test comments
    if (!validateTestComments(code)) {
      errors.push('Each test method must have a descriptive comment');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Gets the current formatter configuration
   */
  getConfig(): FormatterConfig {
    return { ...this.config };
  }
}

/**
 * Internal interface for parsed code sections
 */
interface CodeSections {
  packageDeclaration: string;
  imports: string[];
  classContent: string[];
}

/**
 * Result of formatting validation
 */
export interface FormattingValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Factory function to create a CodeFormatter instance
 */
export function createCodeFormatter(config?: Partial<FormatterConfig>): CodeFormatter {
  const mergedConfig: FormatterConfig = {
    ...DEFAULT_FORMATTER_CONFIG,
    ...config
  };
  return new CodeFormatter(mergedConfig);
}

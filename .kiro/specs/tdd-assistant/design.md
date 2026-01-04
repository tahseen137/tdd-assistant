# Design Document: TDD Assistant

## Overview

TDD Assistant is a Node.js CLI tool that generates JUnit 5 test scaffolds from user stories for Java/Spring Boot projects. It uses OpenAI's API to intelligently parse user stories and extract test cases, then generates well-formatted test files that follow TDD principles (tests that fail initially).

Additionally, TDD Assistant provides a validation feature that analyzes existing implementation code against user stories to verify that all acceptance criteria are satisfied, generating coverage reports that help developers identify gaps in their implementation.

The tool is designed to be portable (runs anywhere Node.js is installed), configurable, and developer-friendly with both batch and interactive modes.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Layer                                │
│  (Commander.js - handles commands, flags, and user interaction) │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ generate command │  │ validate command │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core Engine                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Config    │  │   Story     │  │      Test Generator     │ │
│  │   Loader    │  │   Parser    │  │   (Java/Spring Boot)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │    Code     │  │  Criteria   │  │     Validation          │ │
│  │   Analyzer  │  │   Matcher   │  │     Reporter            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI Service Layer                            │
│              (OpenAI API integration)                            │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │ Test Case Extraction │  │ Code-Criteria Match  │            │
│  └──────────────────────┘  └──────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Output Layer                                │
│  (File writer / stdout - generates .java test files & reports)  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. CLI Module (`src/cli/index.ts`)

Handles command-line interface using Commander.js.

```typescript
interface CLIOptions {
  story?: string;
  file?: string;
  output?: string;
  interactive?: boolean;
  config?: string;
  model?: string;
}

interface GenerateCommand {
  execute(options: CLIOptions): Promise<void>;
}
```

### 2. Config Loader (`src/config/loader.ts`)

Loads and merges configuration from file and CLI.

```typescript
interface TDDAssistantConfig {
  packageName: string;
  outputDirectory: string;
  testNamingConvention: 'should' | 'given_when_then' | 'test';
  aiModel: string;
  apiKey?: string;
}

interface ConfigLoader {
  load(cliOverrides?: Partial<TDDAssistantConfig>): TDDAssistantConfig;
}
```

### 3. Story Parser (`src/parser/story-parser.ts`)

Parses user stories into structured format.

```typescript
interface UserStory {
  role: string;
  feature: string;
  benefit: string;
  rawText: string;
  acceptanceCriteria?: string[];
}

interface StoryParser {
  parse(storyText: string): UserStory;
  validate(story: UserStory): ValidationResult;
}
```

### 4. AI Service (`src/ai/openai-service.ts`)

Integrates with OpenAI API for test case extraction.

```typescript
interface TestCase {
  name: string;
  description: string;
  type: 'happy_path' | 'error' | 'edge_case' | 'boundary';
  assertions: string[];
}

interface AIService {
  extractTestCases(story: UserStory): Promise<TestCase[]>;
  isAvailable(): Promise<boolean>;
}
```

### 5. Test Generator (`src/generator/java-generator.ts`)

Generates JUnit 5 test code for Java/Spring Boot.

```typescript
interface GeneratedTest {
  className: string;
  packageName: string;
  imports: string[];
  testMethods: TestMethod[];
  sourceCode: string;
}

interface TestMethod {
  name: string;
  annotations: string[];
  body: string;
  comment: string;
}

interface TestGenerator {
  generate(testCases: TestCase[], config: TDDAssistantConfig): GeneratedTest;
  formatCode(code: string): string;
}
```

### 6. Output Writer (`src/output/writer.ts`)

Writes generated tests to files or stdout.

```typescript
interface OutputWriter {
  writeToFile(test: GeneratedTest, directory: string): Promise<string>;
  writeToStdout(test: GeneratedTest): void;
}
```

### 7. Code Analyzer (`src/validator/code-analyzer.ts`)

Analyzes source code files to extract structure and logic.

```typescript
interface SourceFile {
  path: string;
  content: string;
  language: 'java' | 'typescript' | 'javascript';
}

interface CodeStructure {
  classes: ClassInfo[];
  methods: MethodInfo[];
  imports: string[];
  annotations: string[];
}

interface ClassInfo {
  name: string;
  methods: MethodInfo[];
  fields: string[];
  annotations: string[];
}

interface MethodInfo {
  name: string;
  parameters: string[];
  returnType: string;
  body: string;
  annotations: string[];
}

interface CodeAnalyzer {
  analyzeFile(filePath: string): Promise<SourceFile>;
  analyzeDirectory(dirPath: string, recursive: boolean): Promise<SourceFile[]>;
  extractStructure(source: SourceFile): CodeStructure;
}
```

### 8. Criteria Extractor (`src/validator/criteria-extractor.ts`)

Extracts acceptance criteria from user stories.

```typescript
interface AcceptanceCriterion {
  id: string;                    // "AC-1", "AC-2", etc.
  description: string;           // The criterion text
  type: CriterionType;           // happy_path, error, edge_case, boundary
  keywords: string[];            // Key terms for matching
}

type CriterionType = 'happy_path' | 'error' | 'edge_case' | 'boundary' | 'functional';

interface CriteriaExtractor {
  extract(story: UserStory): Promise<AcceptanceCriterion[]>;
  parseFromText(text: string): AcceptanceCriterion[];
}
```

### 9. Criteria Matcher (`src/validator/criteria-matcher.ts`)

Matches acceptance criteria to code implementations using AI.

```typescript
interface CriterionMatch {
  criterion: AcceptanceCriterion;
  status: CoverageStatus;
  evidence: CodeEvidence[];
  confidence: number;            // 0-100 confidence score
  suggestions?: string[];        // Suggestions if not fully covered
}

type CoverageStatus = 'covered' | 'partially_covered' | 'not_covered';

interface CodeEvidence {
  filePath: string;
  className?: string;
  methodName?: string;
  lineNumbers: { start: number; end: number };
  snippet: string;
  explanation: string;
}

interface CriteriaMatcher {
  match(
    criteria: AcceptanceCriterion[],
    codeStructures: CodeStructure[],
    sourceFiles: SourceFile[]
  ): Promise<CriterionMatch[]>;
}
```

### 10. Validation Reporter (`src/validator/validation-reporter.ts`)

Generates validation reports in various formats.

```typescript
interface ValidationReport {
  story: UserStorySummary;
  criteria: CriterionMatch[];
  summary: ValidationSummary;
  generatedAt: Date;
}

interface UserStorySummary {
  role: string;
  feature: string;
  benefit: string;
  totalCriteria: number;
}

interface ValidationSummary {
  totalCriteria: number;
  covered: number;
  partiallyCovered: number;
  notCovered: number;
  coveragePercentage: number;
  overallStatus: 'pass' | 'partial' | 'fail';
}

type ReportFormat = 'console' | 'json' | 'markdown';

interface ValidationReporter {
  generate(report: ValidationReport, format: ReportFormat): string;
  writeToFile(report: ValidationReport, filePath: string, format: ReportFormat): Promise<void>;
  writeToConsole(report: ValidationReport): void;
}
```

## Data Models

### User Story Model

```typescript
interface UserStory {
  role: string;           // "user", "admin", "developer"
  feature: string;        // "register with email and password"
  benefit: string;        // "I can access the system"
  rawText: string;        // Original story text
  acceptanceCriteria: string[];  // Additional criteria if provided
}
```

### Test Case Model

```typescript
interface TestCase {
  name: string;           // "shouldRegisterUserWithValidCredentials"
  description: string;    // Human-readable description
  type: TestCaseType;     // happy_path, error, edge_case, boundary
  assertions: string[];   // Expected assertions
  mockDependencies: string[];  // Dependencies to mock
}

type TestCaseType = 'happy_path' | 'error' | 'edge_case' | 'boundary';
```

### Configuration Model

```typescript
interface TDDAssistantConfig {
  packageName: string;              // "com.example.myapp"
  outputDirectory: string;          // "src/test/java"
  testNamingConvention: NamingConvention;
  aiModel: string;                  // "gpt-4" or "gpt-3.5-turbo"
  apiKey: string;                   // OpenAI API key
  springBootVersion?: string;       // "3.x" for annotation selection
}

type NamingConvention = 'should' | 'given_when_then' | 'test';
```

### Validation CLI Options Model

```typescript
interface ValidateCLIOptions {
  story?: string;
  file?: string;
  code: string;                     // Required: path to code file or directory
  recursive?: boolean;              // Scan directory recursively
  format?: 'console' | 'json' | 'markdown';
  output?: string;                  // Output file path for report
  interactive?: boolean;
  config?: string;
  model?: string;
}
```

### Validation Report Model

```typescript
interface ValidationReport {
  story: {
    role: string;
    feature: string;
    benefit: string;
    rawText: string;
  };
  criteria: Array<{
    id: string;
    description: string;
    type: string;
    status: 'covered' | 'partially_covered' | 'not_covered';
    confidence: number;
    evidence: Array<{
      filePath: string;
      methodName?: string;
      lineNumbers: { start: number; end: number };
      snippet: string;
      explanation: string;
    }>;
    suggestions?: string[];
  }>;
  summary: {
    totalCriteria: number;
    covered: number;
    partiallyCovered: number;
    notCovered: number;
    coveragePercentage: number;
    overallStatus: 'pass' | 'partial' | 'fail';
  };
  generatedAt: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: User Story Parsing Completeness

*For any* user story in standard format ("As a [role], I want [feature], so that [benefit]"), the parser should extract all three components (role, feature, benefit) as non-empty strings.

**Validates: Requirements 2.1**

### Property 2: Test Case Count Matches Acceptance Criteria

*For any* user story with N acceptance criteria, the AI engine should generate at least N test cases.

**Validates: Requirements 2.2**

### Property 3: Generated Test Structure Validity

*For any* set of test cases, the generated Java code should:
- Contain JUnit 5 @Test annotations
- Include a fail("Not implemented yet") call in each test method
- Have exactly one test method per test case
- Include Mockito imports when dependencies are present

**Validates: Requirements 3.1, 3.4, 3.5**

### Property 4: Test Method Naming Convention Compliance

*For any* generated test method and configured naming convention, the method name should match the pattern:
- 'should' convention: `should[Behavior]When[Condition]`
- 'given_when_then' convention: `given[State]_when[Action]_then[Result]`
- 'test' convention: `test[Behavior]`

**Validates: Requirements 3.3**

### Property 5: Configuration Merge Precedence

*For any* configuration setting that exists in both the config file and CLI flags, the CLI value should always override the file value.

**Validates: Requirements 4.3**

### Property 6: Output File Path Correctness

*For any* valid output directory and package name, the generated test file should be written to `{outputDir}/{packagePath}/{ClassName}Test.java` where packagePath is the package name with dots replaced by directory separators.

**Validates: Requirements 3.6**

### Property 7: Code Formatting Consistency

*For any* generated Java code:
- Imports should appear at the top of the file before the class declaration
- Each test method should have a descriptive comment
- Indentation should be consistent (4 spaces per level)

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 8: Invalid Command Error Handling

*For any* invalid CLI command or missing required arguments, the system should return a non-zero exit code and display an error message containing usage instructions.

**Validates: Requirements 1.5**

### Property 9: Selected Test Case Generation

*For any* selection of N test cases in interactive mode, the generated output should contain exactly N test methods.

**Validates: Requirements 7.4**

### Property 10: Acceptance Criteria Extraction Completeness

*For any* user story with explicitly listed acceptance criteria, the criteria extractor should identify and return all listed criteria as separate AcceptanceCriterion objects.

**Validates: Requirements 8.4**

### Property 11: Validation Report Criteria Count Consistency

*For any* validation run, the sum of covered + partially_covered + not_covered criteria in the report should equal the total number of extracted acceptance criteria.

**Validates: Requirements 8.7, 8.11**

### Property 12: Coverage Status Mutual Exclusivity

*For any* criterion in a validation report, the status should be exactly one of: 'covered', 'partially_covered', or 'not_covered' - never multiple or none.

**Validates: Requirements 8.8, 8.9, 8.10**

### Property 13: Evidence Requirement for Covered Criteria

*For any* criterion marked as 'covered' or 'partially_covered', the validation report should include at least one CodeEvidence object with a non-empty snippet and explanation.

**Validates: Requirements 8.8, 8.9**

### Property 14: Suggestions Requirement for Uncovered Criteria

*For any* criterion marked as 'not_covered', the validation report should include at least one implementation suggestion.

**Validates: Requirements 8.10**

### Property 15: Coverage Percentage Calculation Accuracy

*For any* validation report, the coveragePercentage should equal (covered + 0.5 * partiallyCovered) / totalCriteria * 100, rounded to one decimal place.

**Validates: Requirements 8.11**

### Property 16: Report Format Output Validity

*For any* validation report output:
- JSON format should be valid parseable JSON
- Markdown format should contain proper heading structure
- Console format should include colored status indicators

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 17: Recursive File Discovery

*For any* directory path with the --recursive flag, the code analyzer should discover all source files matching supported extensions (.java, .ts, .js) in all subdirectories.

**Validates: Requirements 8.3**

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Missing API key | Display setup instructions with link to OpenAI |
| Invalid user story format | Prompt for clarification or show format example |
| AI service unavailable | Retry with exponential backoff, then fail gracefully |
| Invalid output directory | Create directory if possible, otherwise error |
| File write permission denied | Display error with suggested fix |
| Invalid config file | Show validation errors with line numbers |
| Code path not found | Display error with valid path suggestion |
| No source files found | Display warning and suggest checking path/extensions |
| Unsupported file type | Skip file with warning, continue with supported files |
| Code parsing error | Log warning, continue with partial analysis |
| No acceptance criteria found | Prompt user to add criteria or use AI to infer them |
| AI matching timeout | Return partial results with timeout warning |

## Testing Strategy

### Unit Tests

- Test CLI argument parsing with various input combinations
- Test user story parsing with valid and invalid formats
- Test configuration loading and merging
- Test Java code generation formatting
- Test file path construction from package names
- Test code analyzer with various Java/TypeScript file structures
- Test criteria extraction from different story formats
- Test validation report generation in all formats
- Test coverage percentage calculations

### Property-Based Tests

Using fast-check library for property-based testing:

- **Property 1**: User story parsing completeness - generate random valid user stories and verify all parts extracted
- **Property 2**: Test case count matches criteria - generate stories with varying criteria counts
- **Property 3**: Generated test structure validity - verify JUnit annotations, fail() calls, method count
- **Property 4**: Naming convention compliance - generate test names and verify pattern matching
- **Property 5**: Configuration merge precedence - generate random config combinations
- **Property 6**: Output file path correctness - verify package-to-path conversion
- **Property 7**: Code formatting consistency - verify import order, comments, indentation
- **Property 8**: Invalid command error handling - generate invalid commands and verify errors
- **Property 9**: Selected test case generation - verify output matches selection count
- **Property 10**: Acceptance criteria extraction completeness - verify all criteria extracted
- **Property 11**: Validation report criteria count consistency - verify sum equals total
- **Property 12**: Coverage status mutual exclusivity - verify exactly one status per criterion
- **Property 13**: Evidence requirement for covered criteria - verify evidence exists
- **Property 14**: Suggestions requirement for uncovered criteria - verify suggestions exist
- **Property 15**: Coverage percentage calculation accuracy - verify formula correctness
- **Property 16**: Report format output validity - verify format-specific requirements
- **Property 17**: Recursive file discovery - verify all files found in subdirectories

### Integration Tests

- End-to-end test: story input → test file output
- End-to-end test: story + code → validation report
- AI service integration with mock responses
- File system operations
- Config file loading
- Validation with real Java/TypeScript projects

### Test Framework

- **Unit/Integration**: Jest
- **Property-Based**: fast-check (minimum 100 iterations per property)
- **Mocking**: Jest mocks for AI service and file system

### Test Annotations

Each property test must be annotated with:
```typescript
// Feature: tdd-assistant, Property N: [property description]
// Validates: Requirements X.Y
```

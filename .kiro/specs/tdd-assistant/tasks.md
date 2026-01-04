# Implementation Plan: Story Validation Feature

## Overview

This implementation plan adds the `validate` command to TDD Assistant, enabling developers to validate their implementation code against user story acceptance criteria. The feature uses AI to analyze code and generate coverage reports.

## Tasks

- [ ] 1. Set up validator module structure
  - Create `src/validator/` directory
  - Create index.ts with module exports
  - Add TypeScript interfaces for all validator components
  - _Requirements: 8.1, 8.4, 8.7_

- [ ] 2. Implement Code Analyzer
  - [ ] 2.1 Create code-analyzer.ts with SourceFile and CodeStructure interfaces
    - Implement `analyzeFile()` to read and parse single files
    - Implement `analyzeDirectory()` with recursive option
    - Support .java, .ts, .js file extensions
    - _Requirements: 8.3, 8.5_

  - [ ]* 2.2 Write property test for recursive file discovery
    - **Property 17: Recursive File Discovery**
    - **Validates: Requirements 8.3**

  - [ ] 2.3 Implement `extractStructure()` for Java files
    - Extract class names, method signatures, annotations
    - Extract method bodies for AI analysis
    - _Requirements: 8.5_

- [ ] 3. Implement Criteria Extractor
  - [ ] 3.1 Create criteria-extractor.ts with AcceptanceCriterion interface
    - Implement `parseFromText()` for explicit criteria lists
    - Implement `extract()` using AI for implicit criteria
    - Assign unique IDs (AC-1, AC-2, etc.)
    - Categorize criteria by type (happy_path, error, edge_case, boundary)
    - _Requirements: 8.4_

  - [ ]* 3.2 Write property test for criteria extraction completeness
    - **Property 10: Acceptance Criteria Extraction Completeness**
    - **Validates: Requirements 8.4**

- [ ] 4. Implement Criteria Matcher
  - [ ] 4.1 Create criteria-matcher.ts with CriterionMatch interface
    - Implement AI prompt for code-criteria matching
    - Return confidence scores (0-100)
    - Generate suggestions for uncovered criteria
    - _Requirements: 8.6, 8.8, 8.9, 8.10_

  - [ ]* 4.2 Write property test for coverage status mutual exclusivity
    - **Property 12: Coverage Status Mutual Exclusivity**
    - **Validates: Requirements 8.8, 8.9, 8.10**

  - [ ]* 4.3 Write property test for evidence requirement
    - **Property 13: Evidence Requirement for Covered Criteria**
    - **Validates: Requirements 8.8, 8.9**

  - [ ]* 4.4 Write property test for suggestions requirement
    - **Property 14: Suggestions Requirement for Uncovered Criteria**
    - **Validates: Requirements 8.10**

- [ ] 5. Checkpoint - Core validator components
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Validation Reporter
  - [ ] 6.1 Create validation-reporter.ts with ValidationReport interface
    - Implement `calculateSummary()` for coverage statistics
    - Implement coverage percentage formula
    - Determine overall status (pass/partial/fail)
    - _Requirements: 8.7, 8.11_

  - [ ]* 6.2 Write property test for criteria count consistency
    - **Property 11: Validation Report Criteria Count Consistency**
    - **Validates: Requirements 8.7, 8.11**

  - [ ]* 6.3 Write property test for coverage percentage accuracy
    - **Property 15: Coverage Percentage Calculation Accuracy**
    - **Validates: Requirements 8.11**

  - [ ] 6.4 Implement console format output
    - Color-coded status indicators (green/yellow/red)
    - Story summary section
    - Criteria list with evidence snippets
    - Recommendations section
    - _Requirements: 9.1, 9.5_

  - [ ] 6.5 Implement JSON format output
    - Valid JSON structure matching ValidationReport interface
    - _Requirements: 9.2_

  - [ ] 6.6 Implement Markdown format output
    - Proper heading structure (H1, H2, H3)
    - Code blocks for snippets
    - Status badges/indicators
    - _Requirements: 9.3_

  - [ ]* 6.7 Write property test for report format validity
    - **Property 16: Report Format Output Validity**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [ ] 6.8 Implement file output writer
    - Write report to specified path
    - Create directories if needed
    - _Requirements: 9.4_

- [ ] 7. Checkpoint - Reporter complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Validate CLI Command
  - [ ] 8.1 Add validate command to CLI module
    - Add --story, --file, --code options
    - Add --recursive flag
    - Add --format option (console/json/markdown)
    - Add --output option for file path
    - Add --interactive flag
    - _Requirements: 8.1, 8.2, 8.3, 9.2, 9.3, 9.4_

  - [ ] 8.2 Implement handleValidateCommand()
    - Validate CLI arguments
    - Load configuration
    - Parse user story
    - Analyze code files
    - Extract criteria
    - Match criteria to code
    - Generate and output report
    - _Requirements: 8.1, 8.2, 8.7_

  - [ ]* 8.3 Write unit tests for validate command argument parsing
    - Test required --code argument
    - Test --story vs --file mutual exclusivity
    - Test format option validation
    - _Requirements: 8.1, 8.2_

- [ ] 9. Implement Validation Interactive Mode
  - [ ] 9.1 Create validation-interactive.ts
    - Display validation results with navigation
    - Allow drilling down into criteria details
    - Show code snippets for each criterion
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 9.2 Implement manual verification marking
    - Allow marking criteria as manually verified
    - Update report state
    - _Requirements: 10.4_

  - [ ] 9.3 Implement state persistence
    - Save final validation state on confirm
    - _Requirements: 10.5_

- [ ] 10. Integration and wiring
  - [ ] 10.1 Update AI service with validation methods
    - Add `extractCriteria()` method
    - Add `matchCriteriaToCode()` method
    - _Requirements: 8.4, 8.6_

  - [ ] 10.2 Wire all components in validate command handler
    - Connect CodeAnalyzer → CriteriaExtractor → CriteriaMatcher → ValidationReporter
    - Handle errors gracefully
    - _Requirements: 8.1, 8.7_

  - [ ]* 10.3 Write integration test for end-to-end validation
    - Test story + code → validation report flow
    - Use mock AI responses
    - _Requirements: 8.1, 8.7_

- [ ] 11. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Update documentation
  - [ ] 12.1 Update README with validate command usage
    - Add validate command examples
    - Document CLI options
    - Add sample output
    - _Requirements: 8.1, 9.1_

  - [ ] 12.2 Update DESIGN.md with validation architecture
    - Sync with spec design document
    - _Requirements: 8.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript and follows existing project patterns

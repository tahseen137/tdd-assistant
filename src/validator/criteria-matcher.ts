/**
 * Criteria Matcher
 * Matches acceptance criteria to code implementations using AI
 * 
 * Requirements: 8.6, 8.8, 8.9, 8.10
 */

import { 
  AcceptanceCriterion, 
  CodeStructure, 
  SourceFile, 
  CriterionMatch,
  CoverageStatus,
  CodeEvidence
} from './types';
import OpenAI from 'openai';

/**
 * Interface for the Criteria Matcher
 */
export interface CriteriaMatcher {
  /**
   * Match acceptance criteria to code implementations
   */
  match(
    criteria: AcceptanceCriterion[],
    codeStructures: CodeStructure[],
    sourceFiles: SourceFile[]
  ): Promise<CriterionMatch[]>;
}

/**
 * Configuration for CriteriaMatcher
 */
export interface CriteriaMatcherConfig {
  apiKey?: string;
  model?: string;
}

/**
 * Factory function to create a CriteriaMatcher instance
 * Requirement: 8.6
 */
export function createCriteriaMatcher(config?: CriteriaMatcherConfig): CriteriaMatcher {
  return new DefaultCriteriaMatcher(config);
}

/**
 * Create a CriterionMatch with 'covered' status
 */
export function createCoveredMatch(
  criterion: AcceptanceCriterion,
  evidence: CodeEvidence[],
  confidence: number
): CriterionMatch {
  return {
    criterion,
    status: 'covered',
    evidence,
    confidence: Math.min(100, Math.max(0, confidence))
  };
}

/**
 * Create a CriterionMatch with 'partially_covered' status
 */
export function createPartiallyCoveredMatch(
  criterion: AcceptanceCriterion,
  evidence: CodeEvidence[],
  confidence: number,
  suggestions: string[]
): CriterionMatch {
  return {
    criterion,
    status: 'partially_covered',
    evidence,
    confidence: Math.min(100, Math.max(0, confidence)),
    suggestions
  };
}

/**
 * Create a CriterionMatch with 'not_covered' status
 */
export function createNotCoveredMatch(
  criterion: AcceptanceCriterion,
  suggestions: string[]
): CriterionMatch {
  return {
    criterion,
    status: 'not_covered',
    evidence: [],
    confidence: 0,
    suggestions
  };
}

/**
 * Create a CodeEvidence object
 */
export function createCodeEvidence(
  filePath: string,
  snippet: string,
  explanation: string,
  lineNumbers: { start: number; end: number },
  className?: string,
  methodName?: string
): CodeEvidence {
  return {
    filePath,
    className,
    methodName,
    lineNumbers,
    snippet,
    explanation
  };
}

/**
 * Validate that a CriterionMatch has required fields based on status
 */
export function validateCriterionMatch(match: CriterionMatch): boolean {
  // Status must be one of the valid values
  const validStatuses: CoverageStatus[] = ['covered', 'partially_covered', 'not_covered'];
  if (!validStatuses.includes(match.status)) {
    return false;
  }
  
  // Covered and partially_covered must have evidence
  if ((match.status === 'covered' || match.status === 'partially_covered') && 
      match.evidence.length === 0) {
    return false;
  }
  
  // Not covered must have suggestions
  if (match.status === 'not_covered' && 
      (!match.suggestions || match.suggestions.length === 0)) {
    return false;
  }
  
  // Confidence must be in valid range
  if (match.confidence < 0 || match.confidence > 100) {
    return false;
  }
  
  return true;
}

/**
 * Prompt template for matching criteria to code
 */
const CRITERIA_MATCHING_PROMPT = `You are a code analysis expert. Analyze the following code and determine how well it implements the given acceptance criterion.

Acceptance Criterion:
ID: {criterionId}
Description: {criterionDescription}
Type: {criterionType}
Keywords: {keywords}

Code to analyze:
{codeContent}

Analyze the code and determine:
1. Is this criterion implemented? (covered, partially_covered, or not_covered)
2. What evidence in the code supports this?
3. What is your confidence level (0-100)?
4. If not fully covered, what suggestions would help complete the implementation?

Respond with JSON in this format:
{
  "status": "covered" | "partially_covered" | "not_covered",
  "confidence": 0-100,
  "evidence": [
    {
      "methodName": "methodName",
      "className": "ClassName",
      "lineStart": 10,
      "lineEnd": 20,
      "snippet": "relevant code snippet",
      "explanation": "why this code implements the criterion"
    }
  ],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

/**
 * Build code content string from structures and files
 */
function buildCodeContent(
  codeStructures: CodeStructure[],
  sourceFiles: SourceFile[]
): string {
  const parts: string[] = [];
  
  for (const structure of codeStructures) {
    parts.push(`\n--- File: ${structure.filePath} ---`);
    
    for (const cls of structure.classes) {
      parts.push(`\nClass: ${cls.name}`);
      if (cls.annotations.length > 0) {
        parts.push(`Annotations: ${cls.annotations.join(', ')}`);
      }
      
      for (const method of cls.methods) {
        parts.push(`\n  Method: ${method.name}(${method.parameters.join(', ')})`);
        if (method.annotations.length > 0) {
          parts.push(`  Annotations: ${method.annotations.join(', ')}`);
        }
        if (method.body) {
          parts.push(`  Body:\n${method.body}`);
        }
      }
    }
    
    for (const method of structure.methods) {
      parts.push(`\nFunction: ${method.name}(${method.parameters.join(', ')})`);
      if (method.body) {
        parts.push(`Body:\n${method.body}`);
      }
    }
  }
  
  // Also include raw source for context
  if (sourceFiles.length <= 3) {
    for (const file of sourceFiles) {
      if (file.content.length < 5000) {
        parts.push(`\n--- Full Source: ${file.path} ---`);
        parts.push(file.content);
      }
    }
  }
  
  return parts.join('\n');
}

/**
 * Parse AI response for criterion match
 */
function parseMatchResponse(
  responseText: string,
  criterion: AcceptanceCriterion,
  filePath: string
): CriterionMatch {
  try {
    // Try to extract JSON from the response
    let jsonStr = responseText;
    
    // Handle markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // Try to find JSON object in the response
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
    
    const parsed = JSON.parse(jsonStr);
    
    const status: CoverageStatus = 
      parsed.status === 'covered' ? 'covered' :
      parsed.status === 'partially_covered' ? 'partially_covered' :
      'not_covered';
    
    const confidence = typeof parsed.confidence === 'number' 
      ? Math.min(100, Math.max(0, parsed.confidence))
      : 0;
    
    const evidence: CodeEvidence[] = [];
    if (Array.isArray(parsed.evidence)) {
      for (const ev of parsed.evidence) {
        if (ev.explanation || ev.snippet) {
          evidence.push({
            filePath: ev.filePath || filePath,
            className: ev.className,
            methodName: ev.methodName,
            lineNumbers: {
              start: ev.lineStart || ev.lineNumbers?.start || 0,
              end: ev.lineEnd || ev.lineNumbers?.end || 0
            },
            snippet: ev.snippet || '',
            explanation: ev.explanation || ''
          });
        }
      }
    }
    
    const suggestions: string[] = Array.isArray(parsed.suggestions) 
      ? parsed.suggestions.filter((s: unknown) => typeof s === 'string')
      : [];
    
    // Ensure constraints are met
    if (status === 'covered' || status === 'partially_covered') {
      if (evidence.length === 0) {
        // Add a default evidence if none provided
        evidence.push({
          filePath,
          lineNumbers: { start: 0, end: 0 },
          snippet: 'Code analysis indicates implementation',
          explanation: parsed.explanation || 'Criterion appears to be implemented based on code analysis'
        });
      }
    }
    
    if (status === 'not_covered' && suggestions.length === 0) {
      suggestions.push(`Implement functionality for: ${criterion.description}`);
    }
    
    if (status === 'partially_covered' && suggestions.length === 0) {
      suggestions.push(`Complete implementation for: ${criterion.description}`);
    }
    
    return {
      criterion,
      status,
      evidence,
      confidence,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
    
  } catch {
    // If parsing fails, return not_covered with suggestions
    return createNotCoveredMatch(criterion, [
      `Unable to analyze code for criterion: ${criterion.description}`,
      'Consider reviewing the implementation manually'
    ]);
  }
}

/**
 * Perform keyword-based matching as fallback
 */
function keywordMatch(
  criterion: AcceptanceCriterion,
  codeStructures: CodeStructure[],
  sourceFiles: SourceFile[]
): CriterionMatch {
  const keywords = criterion.keywords;
  const matchedEvidence: CodeEvidence[] = [];
  let totalMatches = 0;
  
  // Search for keywords in code structures
  for (const structure of codeStructures) {
    for (const cls of structure.classes) {
      for (const method of cls.methods) {
        const methodText = `${method.name} ${method.body}`.toLowerCase();
        const matchedKeywords = keywords.filter(kw => methodText.includes(kw.toLowerCase()));
        
        if (matchedKeywords.length > 0) {
          totalMatches += matchedKeywords.length;
          matchedEvidence.push({
            filePath: structure.filePath,
            className: cls.name,
            methodName: method.name,
            lineNumbers: { start: method.lineStart, end: method.lineEnd },
            snippet: method.body.slice(0, 200),
            explanation: `Method contains keywords: ${matchedKeywords.join(', ')}`
          });
        }
      }
    }
  }
  
  // Also search in raw source files
  for (const file of sourceFiles) {
    const content = file.content.toLowerCase();
    const matchedKeywords = keywords.filter(kw => content.includes(kw.toLowerCase()));
    
    if (matchedKeywords.length > 0 && matchedEvidence.length === 0) {
      totalMatches += matchedKeywords.length;
      
      // Find a relevant snippet
      const firstKeyword = matchedKeywords[0].toLowerCase();
      const keywordIndex = content.indexOf(firstKeyword);
      const snippetStart = Math.max(0, keywordIndex - 50);
      const snippetEnd = Math.min(content.length, keywordIndex + 150);
      const snippet = file.content.slice(snippetStart, snippetEnd);
      
      matchedEvidence.push({
        filePath: file.path,
        lineNumbers: { start: 0, end: 0 },
        snippet,
        explanation: `File contains keywords: ${matchedKeywords.join(', ')}`
      });
    }
  }
  
  // Determine status based on matches
  const keywordCoverage = keywords.length > 0 ? totalMatches / keywords.length : 0;
  
  if (keywordCoverage >= 0.7 && matchedEvidence.length > 0) {
    return createCoveredMatch(criterion, matchedEvidence, Math.round(keywordCoverage * 80));
  } else if (keywordCoverage >= 0.3 && matchedEvidence.length > 0) {
    return createPartiallyCoveredMatch(
      criterion,
      matchedEvidence,
      Math.round(keywordCoverage * 60),
      [`Consider adding more implementation for: ${criterion.description}`]
    );
  } else {
    return createNotCoveredMatch(criterion, [
      `Implement functionality for: ${criterion.description}`,
      `Consider adding methods that handle: ${keywords.slice(0, 3).join(', ')}`
    ]);
  }
}

/**
 * Default implementation of CriteriaMatcher
 */
class DefaultCriteriaMatcher implements CriteriaMatcher {
  private client: OpenAI | null = null;
  private config: CriteriaMatcherConfig;

  constructor(config: CriteriaMatcherConfig = {}) {
    this.config = config;
    
    // Try to get API key from environment if not provided
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  /**
   * Match acceptance criteria to code implementations
   * Requirements: 8.6, 8.8, 8.9, 8.10
   */
  async match(
    criteria: AcceptanceCriterion[],
    codeStructures: CodeStructure[],
    sourceFiles: SourceFile[]
  ): Promise<CriterionMatch[]> {
    const matches: CriterionMatch[] = [];
    
    // Build code content once for all criteria
    const codeContent = buildCodeContent(codeStructures, sourceFiles);
    const primaryFilePath = sourceFiles[0]?.path || 'unknown';
    
    for (const criterion of criteria) {
      try {
        if (this.client) {
          // Use AI for matching
          const match = await this.matchWithAI(criterion, codeContent, primaryFilePath);
          matches.push(match);
        } else {
          // Fallback to keyword matching
          const match = keywordMatch(criterion, codeStructures, sourceFiles);
          matches.push(match);
        }
      } catch (error) {
        console.warn(`Error matching criterion ${criterion.id}:`, error);
        // Fallback to keyword matching on error
        const match = keywordMatch(criterion, codeStructures, sourceFiles);
        matches.push(match);
      }
    }
    
    return matches;
  }

  /**
   * Match a single criterion using AI
   */
  private async matchWithAI(
    criterion: AcceptanceCriterion,
    codeContent: string,
    filePath: string
  ): Promise<CriterionMatch> {
    if (!this.client) {
      throw new Error('AI client not available');
    }
    
    const prompt = CRITERIA_MATCHING_PROMPT
      .replace('{criterionId}', criterion.id)
      .replace('{criterionDescription}', criterion.description)
      .replace('{criterionType}', criterion.type)
      .replace('{keywords}', criterion.keywords.join(', '))
      .replace('{codeContent}', codeContent.slice(0, 8000)); // Limit content size
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a code analysis expert. Analyze code to determine if acceptance criteria are implemented. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      
      if (content) {
        return parseMatchResponse(content, criterion, filePath);
      }
    } catch (error) {
      console.warn('AI matching failed, using keyword fallback:', error);
    }
    
    // Return a default not_covered match if AI fails
    return createNotCoveredMatch(criterion, [
      `Unable to analyze: ${criterion.description}`,
      'Consider manual review of the implementation'
    ]);
  }
}

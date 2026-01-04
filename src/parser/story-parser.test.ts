/**
 * Property-based tests for User Story Parser
 * Feature: tdd-assistant, Property 1: User Story Parsing Completeness
 * Validates: Requirements 2.1
 */

import * as fc from 'fast-check';
import { createStoryParser, DefaultStoryParser, UserStory } from './story-parser';

describe('StoryParser', () => {
  const parser = createStoryParser();

  describe('Property 1: User Story Parsing Completeness', () => {
    /**
     * Property 1: User Story Parsing Completeness
     * For any user story in standard format ("As a [role], I want [feature], so that [benefit]"),
     * the parser should extract all three components (role, feature, benefit) as non-empty strings.
     * 
     * Validates: Requirements 2.1
     */
    it('should extract all three components (role, feature, benefit) as non-empty strings for valid user stories', () => {
      // Generate arbitrary non-empty strings for role, feature, and benefit
      // Use alphanumeric strings to avoid regex special characters and ensure clean parsing
      const nonEmptyAlphanumeric = fc.stringOf(
        fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')),
        { minLength: 1, maxLength: 50 }
      ).filter(s => s.trim().length > 0);

      fc.assert(
        fc.property(
          nonEmptyAlphanumeric,
          nonEmptyAlphanumeric,
          nonEmptyAlphanumeric,
          (role, feature, benefit) => {
            // Construct a valid user story in standard format
            const storyText = `As a ${role.trim()}, I want ${feature.trim()}, so that ${benefit.trim()}`;
            
            // Parse the story
            const result = parser.parse(storyText);
            
            // All three components should be non-empty strings
            expect(typeof result.role).toBe('string');
            expect(typeof result.feature).toBe('string');
            expect(typeof result.benefit).toBe('string');
            expect(result.role.length).toBeGreaterThan(0);
            expect(result.feature.length).toBeGreaterThan(0);
            expect(result.benefit.length).toBeGreaterThan(0);
            
            // The raw text should be preserved (trimmed input)
            expect(result.rawText).toBe(storyText);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle "As an" variation correctly', () => {
      const nonEmptyAlphanumeric = fc.stringOf(
        fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')),
        { minLength: 1, maxLength: 50 }
      ).filter(s => s.trim().length > 0);

      fc.assert(
        fc.property(
          nonEmptyAlphanumeric,
          nonEmptyAlphanumeric,
          nonEmptyAlphanumeric,
          (role, feature, benefit) => {
            // Construct a valid user story with "As an" format
            const storyText = `As an ${role.trim()}, I want ${feature.trim()}, so that ${benefit.trim()}`;
            
            // Parse the story
            const result = parser.parse(storyText);
            
            // All three components should be non-empty strings
            expect(result.role.length).toBeGreaterThan(0);
            expect(result.feature.length).toBeGreaterThan(0);
            expect(result.benefit.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit tests for edge cases', () => {
    it('should parse a standard user story correctly', () => {
      const story = 'As a user, I want to login, so that I can access my account';
      const result = parser.parse(story);
      
      expect(result.role).toBe('user');
      expect(result.feature).toBe('login');
      expect(result.benefit).toBe('I can access my account');
    });

    it('should handle user story without "so that" clause', () => {
      const story = 'As a developer, I want to run tests';
      const result = parser.parse(story);
      
      expect(result.role).toBe('developer');
      expect(result.feature).toBe('run tests');
      expect(result.benefit).toBe('');
    });

    it('should handle "I want to" format', () => {
      const story = 'As a user, I want to register with email, so that I can create an account';
      const result = parser.parse(story);
      
      expect(result.role).toBe('user');
      expect(result.feature).toBe('register with email');
      expect(result.benefit).toBe('I can create an account');
    });

    it('should return empty fields for invalid format', () => {
      const story = 'This is not a valid user story';
      const result = parser.parse(story);
      
      expect(result.role).toBe('');
      expect(result.feature).toBe('');
      expect(result.benefit).toBe('');
      expect(result.rawText).toBe(story);
    });
  });

  describe('validate', () => {
    it('should return valid for complete user story', () => {
      const story: UserStory = {
        role: 'user',
        feature: 'login',
        benefit: 'access account',
        rawText: 'As a user, I want to login, so that I can access account'
      };
      
      const result = parser.validate(story);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when role is missing', () => {
      const story: UserStory = {
        role: '',
        feature: 'login',
        benefit: 'access account',
        rawText: ''
      };
      
      const result = parser.validate(story);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User story is missing the role (who)');
    });

    it('should return invalid when benefit is missing', () => {
      const story: UserStory = {
        role: 'user',
        feature: 'login',
        benefit: '',
        rawText: ''
      };
      
      const result = parser.validate(story);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('benefit'))).toBe(true);
    });
  });
});

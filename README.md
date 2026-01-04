# TDD Assistant

A CLI tool that generates JUnit 5 test scaffolds from user stories for Java/Spring Boot projects. It uses AI to intelligently analyze user stories and create comprehensive test cases following Test-Driven Development (TDD) principles.

## Features

- **AI-Powered Test Generation**: Uses OpenAI to analyze user stories and extract meaningful test cases
- **Story Validation**: Validate implementation code against user story acceptance criteria
- **JUnit 5 Support**: Generates tests with proper JUnit 5 annotations (@Test, @BeforeEach, @DisplayName)
- **Spring Boot Integration**: Includes @SpringBootTest, @MockBean annotations when appropriate
- **Multiple Naming Conventions**: Supports `should`, `given_when_then`, and `test` naming patterns
- **Interactive Mode**: Review and select which test cases to generate before output
- **Flexible Configuration**: Configure via JSON file or CLI flags
- **Multiple Input Methods**: Provide user stories directly or from a file
- **Multiple Output Formats**: Generate validation reports in console, JSON, or Markdown format

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- OpenAI API key

### Install from npm

```bash
npm install -g tdd-assistant
```

### Install from source

```bash
git clone https://github.com/tahseen137/tdd-assistant.git
cd tdd-assistant
npm install
npm run build
npm link
```

## Quick Start

1. Set up your OpenAI API key:

```bash
# Option 1: Environment variable
export OPENAI_API_KEY=your-api-key-here

# Option 2: Config file (see Configuration section)
```

2. Generate tests from a user story:

```bash
tdd-assistant generate --story "As a user, I want to login with email and password, so that I can access my account"
```

## Usage

### Basic Commands

```bash
# Show version
tdd-assistant --version

# Show help
tdd-assistant --help

# Show generate command help
tdd-assistant generate --help
```

### Generate Tests

```bash
# From inline story
tdd-assistant generate --story "As a user, I want to register, so that I can create an account"

# From file
tdd-assistant generate --file user-story.txt

# With output directory
tdd-assistant generate --story "..." --output src/test/java

# With custom package name
tdd-assistant generate --story "..." --package-name com.mycompany.tests

# With specific naming convention
tdd-assistant generate --story "..." --naming-convention given_when_then

# Interactive mode (review and select test cases)
tdd-assistant generate --story "..." --interactive
```

### Validate Implementation

Validate your implementation code against a user story to check acceptance criteria coverage:

```bash
# Validate a single file against a story
tdd-assistant validate --story "As a user, I want to login, so that I can access my account" --code src/main/java/UserService.java

# Validate from story file
tdd-assistant validate --file user-story.txt --code src/main/java/

# Recursively scan directory
tdd-assistant validate --story "..." --code src/main/java/ --recursive

# Output as JSON
tdd-assistant validate --story "..." --code src/ --format json --output report.json

# Output as Markdown
tdd-assistant validate --story "..." --code src/ --format markdown --output report.md
```

### Validate Command Options

| Option | Description |
|--------|-------------|
| `--story <story>` | User story text to validate against |
| `--file <path>` | Path to file containing the user story |
| `--code <path>` | (Required) Path to code file or directory to validate |
| `--recursive` | Scan directory recursively for source files |
| `--format <format>` | Output format: console (default), json, or markdown |
| `--output <path>` | Output file path for the validation report |
| `--interactive` | Enable interactive mode to review results |
| `--config <path>` | Path to configuration file |
| `--model <model>` | AI model to use |

### Example Validation Output

```
═══════════════════════════════════════════════════════════════
                    VALIDATION REPORT
═══════════════════════════════════════════════════════════════

📖 STORY SUMMARY
───────────────────────────────────────────────────────────────
  Role:    user
  Feature: login with email and password
  Benefit: I can access my account

📊 COVERAGE SUMMARY
───────────────────────────────────────────────────────────────
  Overall Status: PARTIAL
  Coverage:       66.7%

  ✓ Covered:          2
  ◐ Partially Covered: 1
  ✗ Not Covered:       0
  Total Criteria:    3

📋 CRITERIA DETAILS
───────────────────────────────────────────────────────────────

  ✓ AC-1: User can login with valid credentials
    Status: covered (85% confidence)
    Type: happy_path
    Evidence:
      • UserService.authenticate
        Method validates email and password

  ◐ AC-2: System displays error for invalid credentials
    Status: partially_covered (60% confidence)
    Type: error
    Evidence:
      • UserService.authenticate
        Throws exception on invalid credentials
    Suggestions:
      → Add user-friendly error message display

  ✓ AC-3: User session is created after successful login
    Status: covered (90% confidence)
    Type: functional
    Evidence:
      • SessionManager.createSession
        Creates session with user ID

═══════════════════════════════════════════════════════════════
```

### CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--story <story>` | `-s` | User story text |
| `--file <path>` | `-f` | Path to file containing user story |
| `--output <directory>` | `-o` | Output directory for test files |
| `--interactive` | `-i` | Enable interactive mode |
| `--config <path>` | `-c` | Path to configuration file |
| `--model <model>` | `-m` | AI model (e.g., gpt-4, gpt-3.5-turbo) |
| `--package-name <package>` | `-p` | Java package name |
| `--naming-convention <convention>` | `-n` | Naming convention: should, given_when_then, test |

## Configuration

Create a `.tdd-assistant.json` file in your project root:

```json
{
  "apiKey": "your-openai-api-key",
  "packageName": "com.example.myapp",
  "outputDirectory": "src/test/java",
  "testNamingConvention": "should",
  "aiModel": "gpt-4"
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | - | OpenAI API key (can also use OPENAI_API_KEY env var) |
| `packageName` | string | `com.example` | Java package name for generated tests |
| `outputDirectory` | string | `src/test/java` | Output directory for test files |
| `testNamingConvention` | string | `should` | Naming convention: `should`, `given_when_then`, `test` |
| `aiModel` | string | `gpt-4` | OpenAI model to use |

### Configuration Precedence

1. CLI flags (highest priority)
2. Config file (.tdd-assistant.json)
3. Default values (lowest priority)

## Test Naming Conventions

### `should` (default)
```java
@Test
void shouldRegisterUserWithValidCredentials() { }

@Test
void shouldRejectRegistrationWithInvalidEmail() { }
```

### `given_when_then`
```java
@Test
void givenValidCredentials_whenRegister_thenUserIsCreated() { }

@Test
void givenInvalidEmail_whenRegister_thenErrorIsReturned() { }
```

### `test`
```java
@Test
void testRegisterUserWithValidCredentials() { }

@Test
void testRejectRegistrationWithInvalidEmail() { }
```

## Generated Test Structure

The tool generates JUnit 5 tests with:

- Proper imports (JUnit 5, Mockito, Spring Boot Test)
- Class-level annotations (@SpringBootTest when needed)
- @DisplayName annotations with descriptions
- Test methods that initially fail with `fail("Not implemented yet")`
- Organized imports and consistent formatting

### Example Output

```java
package com.example.myapp;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class UserRegistrationTest {

    @BeforeEach
    void setUp() {
        // TODO: Set up test fixtures
    }

    /**
     * Test: User can register with valid email and password
     * Type: happy_path
     */
    @Test
    @DisplayName("should register user with valid credentials")
    void shouldRegisterUserWithValidCredentials() {
        fail("Not implemented yet");
    }

    /**
     * Test: Registration fails with invalid email format
     * Type: error
     */
    @Test
    @DisplayName("should reject registration with invalid email")
    void shouldRejectRegistrationWithInvalidEmail() {
        fail("Not implemented yet");
    }
}
```

## Error Scenarios

### Missing API Key

```
OpenAI API key is not configured.

To set up your API key:
1. Get your API key from https://platform.openai.com/api-keys
2. Set it in your config file (.tdd-assistant.json):
   { "apiKey": "your-api-key-here" }
3. Or set the OPENAI_API_KEY environment variable
```

**Solution**: Configure your API key via config file or environment variable.

### Missing Story Input

```
Error: You must provide either --story or --file option.

Usage: tdd-assistant generate --story "<user story>" or --file <path>
```

**Solution**: Provide a user story using `--story` or `--file` flag.

### Both Story and File Provided

```
Error: Cannot use both --story and --file options together. Please provide only one.

Usage: tdd-assistant generate --story "<user story>" or --file <path>
```

**Solution**: Use only one input method at a time.

### File Not Found

```
Error: File not found: path/to/story.txt

Please provide a valid file path.
```

**Solution**: Check the file path and ensure the file exists.

### Invalid Naming Convention

```
Error: Invalid naming convention 'invalid'. Use: should, given_when_then, or test
```

**Solution**: Use one of the supported naming conventions.

### Incomplete User Story

```
Warning: User story may be incomplete:
  - User story is missing the benefit (why) - consider adding "so that [benefit]"
```

**Note**: The tool will continue but may generate less accurate test cases. Consider using the full format: "As a [role], I want [feature], so that [benefit]"

### AI Service Unavailable

```
AI service is currently unavailable. Please try again later.

If the problem persists:
1. Check your internet connection
2. Verify your API key is valid
3. Check OpenAI service status at https://status.openai.com
```

**Solution**: Check your connection and API key, or try again later.

### Permission Denied

```
Error: Permission denied writing to /path/to/output

Please check directory permissions or try a different output location.
```

**Solution**: Ensure you have write permissions to the output directory.

## User Story Format

The tool works best with user stories in the standard format:

```
As a [role], I want [feature], so that [benefit]
```

### Examples

```
As a user, I want to login with email and password, so that I can access my account

As an admin, I want to manage user permissions, so that I can control access to features

As a customer, I want to add items to my cart, so that I can purchase multiple products
```

### With Acceptance Criteria

You can include acceptance criteria in your story file:

```
As a user, I want to reset my password, so that I can regain access to my account

Acceptance Criteria:
- User receives a password reset email
- Reset link expires after 24 hours
- New password must meet security requirements
- User is notified of successful password change
```

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

### Running Locally

```bash
npm run dev -- generate --story "..."
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

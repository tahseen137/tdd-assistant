# TDD Assistant

> AI-powered CLI tool that generates JUnit 5 test scaffolds from user stories for Java/Spring Boot projects

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## 🎯 What It Does

TDD Assistant analyzes user stories and automatically generates comprehensive JUnit 5 test scaffolds, helping developers practice true Test-Driven Development by starting with failing tests.

**Key Features:**
- 🤖 **AI-Powered Analysis** - Uses OpenAI to extract test cases from user stories
- ✅ **Story Validation** - Validates implementation code against acceptance criteria
- 🧪 **JUnit 5 Support** - Generates tests with proper annotations and Spring Boot integration
- 🎨 **Multiple Naming Conventions** - Support for `should`, `given_when_then`, and `test` patterns
- 🔄 **Interactive Mode** - Review and select test cases before generation
- 📊 **Coverage Reports** - Generate validation reports in console, JSON, or Markdown

## 🚀 Quick Start

### Installation

```bash
# Install globally via npm
npm install -g tdd-assistant

# Or use from source
git clone https://github.com/tahseen137/tdd-assistant.git
cd tdd-assistant
npm install && npm run build && npm link
```

### Prerequisites

- Node.js 18.0.0 or higher
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Configuration

Set your OpenAI API key:

```bash
# Environment variable (recommended)
export OPENAI_API_KEY=your-api-key-here

# Or create .tdd-assistant.json in your project
{
  "apiKey": "your-api-key-here",
  "packageName": "com.example.myapp",
  "outputDirectory": "src/test/java",
  "testNamingConvention": "should",
  "aiModel": "gpt-4"
}
```

## 📖 Usage

### Generate Tests

```bash
# From inline story
tdd-assistant generate --story "As a user, I want to login with email and password, so that I can access my account"

# From file
tdd-assistant generate --file user-story.txt --output src/test/java

# With custom package and naming convention
tdd-assistant generate --story "..." --package-name com.myapp --naming-convention given_when_then

# Interactive mode (review before generating)
tdd-assistant generate --story "..." --interactive
```

### Validate Implementation

Validate your code against user story acceptance criteria:

```bash
# Validate single file
tdd-assistant validate --story "As a user, I want to login..." --code src/main/java/UserService.java

# Validate entire directory recursively
tdd-assistant validate --file story.txt --code src/main/java/ --recursive

# Output as JSON or Markdown
tdd-assistant validate --story "..." --code src/ --format json --output report.json
tdd-assistant validate --story "..." --code src/ --format markdown --output report.md

# Interactive review mode
tdd-assistant validate --story "..." --code src/ --interactive
```

## 💡 Example Output

### Generated Test

```java
package com.example.myapp;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class UserLoginTest {

    @BeforeEach
    void setUp() {
        // TODO: Set up test fixtures
    }

    /**
     * Test: User can login with valid email and password
     * Type: happy_path
     */
    @Test
    @DisplayName("should login user with valid credentials")
    void shouldLoginUserWithValidCredentials() {
        fail("Not implemented yet");
    }

    /**
     * Test: Login fails with invalid credentials
     * Type: error
     */
    @Test
    @DisplayName("should reject login with invalid credentials")
    void shouldRejectLoginWithInvalidCredentials() {
        fail("Not implemented yet");
    }
}
```

### Validation Report

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
    Evidence:
      • UserService.authenticate - Method validates email and password

  ◐ AC-2: System displays error for invalid credentials
    Status: partially_covered (60% confidence)
    Evidence:
      • UserService.authenticate - Throws exception on invalid credentials
    Suggestions:
      → Add user-friendly error message display

  ✓ AC-3: User session is created after successful login
    Status: covered (90% confidence)
    Evidence:
      • SessionManager.createSession - Creates session with user ID
```

## 🛠️ Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js 18+
- **CLI Framework:** Commander.js
- **AI Integration:** OpenAI API (GPT-4)
- **Testing:** Jest + fast-check (property-based testing)
- **Target Framework:** JUnit 5 + Spring Boot

## 📚 User Story Format

Works best with standard format:

```
As a [role], I want [feature], so that [benefit]

Acceptance Criteria:
- User receives a password reset email
- Reset link expires after 24 hours
- New password must meet security requirements
```

## 🎨 Test Naming Conventions

### `should` (default)
```java
void shouldRegisterUserWithValidCredentials()
void shouldRejectRegistrationWithInvalidEmail()
```

### `given_when_then`
```java
void givenValidCredentials_whenRegister_thenUserIsCreated()
void givenInvalidEmail_whenRegister_thenErrorIsReturned()
```

### `test`
```java
void testRegisterUserWithValidCredentials()
void testRejectRegistrationWithInvalidEmail()
```

## 🔧 CLI Options

### Generate Command

| Option | Description |
|--------|-------------|
| `-s, --story <story>` | User story text |
| `-f, --file <path>` | Path to file containing user story |
| `-o, --output <dir>` | Output directory for test files |
| `-i, --interactive` | Enable interactive mode |
| `-p, --package-name <pkg>` | Java package name |
| `-n, --naming-convention <conv>` | Naming convention (should, given_when_then, test) |
| `-m, --model <model>` | AI model to use (gpt-4, gpt-3.5-turbo) |
| `-c, --config <path>` | Path to configuration file |

### Validate Command

| Option | Description |
|--------|-------------|
| `-s, --story <story>` | User story text |
| `-f, --file <path>` | Path to file containing user story |
| `--code <path>` | **Required** - Path to code file or directory |
| `-r, --recursive` | Scan directory recursively |
| `--format <format>` | Output format: console, json, markdown |
| `-o, --output <path>` | Output file path for report |
| `-i, --interactive` | Enable interactive review mode |
| `-m, --model <model>` | AI model to use |
| `-c, --config <path>` | Path to configuration file |

## 🚧 Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run locally
npm run dev -- generate --story "..."

# Run with debug output
DEBUG=1 tdd-assistant generate --story "..."
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Powered by [OpenAI API](https://platform.openai.com/)
- Built with [Commander.js](https://github.com/tj/commander.js)
- Inspired by Test-Driven Development best practices

---

**Made with ❤️ for TDD practitioners**

/**
 * Output Writer
 * Writes generated tests to files or stdout
 */

import { GeneratedTest } from '../generator/java-generator';

export interface OutputWriter {
  writeToFile(test: GeneratedTest, directory: string): Promise<string>;
  writeToStdout(test: GeneratedTest): void;
}

// Output writer implementation will be added in task 9.1

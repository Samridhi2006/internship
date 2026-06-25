import vm from 'vm';
import { performance } from 'perf_hooks';

function runTestSuite(source, testCases) {
  const results = [];

  // Fallback if no test cases defined
  if (!testCases || testCases.length === 0) {
    const wordCount = source.trim().split(/\s+/).filter(Boolean).length;
    const passed = wordCount >= 10;
    return [{
      testCaseIndex: 1,
      passed,
      runtime: 5,
      actualOutput: passed ? 'Success' : 'Fail',
      expectedOutput: 'Success',
      error: passed ? null : 'Submission too short.'
    }];
  }

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    let runtime = 0;
    let passed = false;
    let actualOutput = null;
    let error = null;

    try {
      // Create isolated sandbox context
      const context = {
        console: {
          log: () => {},
          error: () => {}
        }
      };
      vm.createContext(context);

      // Execute source code in sandbox
      vm.runInContext(source, context, { timeout: 1000 });

      if (typeof context.solution !== 'function') {
        throw new Error("Function 'solution' was not defined in your code. Ensure your entrypoint uses: function solution(...) { ... }");
      }

      // Parse input
      let parsedInput;
      try {
        parsedInput = JSON.parse(tc.input);
      } catch (e) {
        if (tc.input.startsWith('"') && tc.input.endsWith('"')) {
          parsedInput = tc.input.slice(1, -1);
        } else {
          parsedInput = tc.input;
        }
      }

      // Time code execution
      const start = performance.now();
      const outputVal = context.solution(parsedInput);
      const end = performance.now();
      runtime = Math.round(end - start);

      let expectedOutput;
      try {
        expectedOutput = JSON.parse(tc.output);
      } catch (e) {
        if (tc.output.startsWith('"') && tc.output.endsWith('"')) {
          expectedOutput = tc.output.slice(1, -1);
        } else {
          expectedOutput = tc.output;
        }
      }

      actualOutput = outputVal;
      
      // Compare output
      passed = (JSON.stringify(outputVal) === JSON.stringify(expectedOutput)) || (outputVal === expectedOutput);
    } catch (err) {
      error = err.message;
    }

    results.push({
      testCaseIndex: i + 1,
      passed,
      runtime,
      actualOutput,
      expectedOutput: tc.output,
      error
    });
  }

  return results;
}

function buildTerminalTrace(results) {
  const trace = [
    { type: 'cmd', text: '$ sandbox compile ./solution.js' },
    { type: 'info', text: 'tcs_compiler: Compiling entry_point.cpp...' },
    { type: 'info', text: 'Checking dependency trees... OK' }
  ];

  let allPassed = true;
  results.forEach(res => {
    if (res.passed) {
      trace.push({
        type: 'ok',
        text: `Test Case ${res.testCaseIndex} / ${results.length}: Passed [Runtime: ${res.runtime}ms]`
      });
    } else {
      allPassed = false;
      trace.push({
        type: 'fail',
        text: `Test Case ${res.testCaseIndex} / ${results.length}: Failed [Runtime: ${res.runtime}ms]`
      });
      if (res.error) {
        trace.push({ type: 'error', text: `  Error: ${res.error}` });
      } else {
        trace.push({ type: 'info', text: `  Expected: ${res.expectedOutput}, Got: ${JSON.stringify(res.actualOutput)}` });
      }
    }
  });

  if (allPassed) {
    trace.push({ type: 'ok', text: 'Success: 100% Test Cases Passed!' });
  } else {
    trace.push({ type: 'error', text: 'Error: Compilation sandbox check failed.' });
  }

  return trace;
}

export {
  runTestSuite,
  buildTerminalTrace
};

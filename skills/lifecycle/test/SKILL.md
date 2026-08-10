---
name: test
description: Prove implemented behavior with relevant evidence.
disable-model-invocation: true
---

# Test

Prove the implemented behavior against its acceptance criteria.

## Workflow

1. Read the approved acceptance criteria and changed interfaces. Build an evidence matrix covering expected behavior, failure behavior and relevant regressions.
2. Run the project's narrow checks first, then the proportionate broader suite. Use `tdd` when a missing regression test is the correct seam and `performance-optimization` only when a performance claim exists.
3. Mock GPIO, I2C, SPI, serial, MQTT and instruments by default. Obtain explicit permission before any physical hardware test.
4. When a check fails unexpectedly, use `diagnosing-bugs` to reproduce and localize it. Do not weaken assertions or skip required checks to obtain green output.
5. Record commands, results, skipped checks and remaining uncertainty. Recommend `/review` only when required evidence is green.

## Completion

Every acceptance criterion has evidence, required checks pass and every omitted or blocked check is visible.

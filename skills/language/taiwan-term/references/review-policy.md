# Review policy

Apply these classifications to every finding:

- **Replace**: The China-side term has the same intended meaning and the Taiwan wording is natural in context.
- **Rewrite**: The suggested Taiwan term is too literal; rewrite the sentence while preserving its meaning.
- **Domain term**: Keep only deliberately canonical terms that are necessary and Taiwan-appropriate. Otherwise rewrite user-facing domain language with the glossary's Taiwan wording and update related in-scope surfaces.
- **Protected text**: Keep identifiers, payload fields, commands, paths, quotations, vendor material, generated output, and historical records unless the user explicitly includes them.
- **False positive**: Keep substrings and unrelated senses that merely contain the detected characters.

Process longer phrases before their substrings. Review surrounding prose for semantically awkward regional wording that literal substitution would miss; choose the intended Taiwan term instead of the snapshot's suggestion when meanings differ. Verify UI labels, logs, test expectations, and documentation together when they represent the same user-facing contract. Never convert a full-mode result into a blocking rule without a reviewed project-specific exception policy.

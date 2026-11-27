# UI Design & Motion Rules

- Follow the native UI and motion loop (`ask-emil`): `ui-prototype` (isolated variants before changing production code) -> `pick-ui-library` / `animate` / `choreograph` / `gestures` / `animate-expo` -> `break-ui` / `review-animations` / `mobile-native` / `animation-performance` -> `learn-taste` (record rules and their rationale in root `DESIGN.md` or lint checks).
- Resolve references to `prototype` inside skills sourced from `emilkowalski/skills` as `ui-prototype`, keeping the software `prototype` skill distinct.
- Honor `disable-model-invocation: true` in each skill's frontmatter (the live index) and run user-invoked skills only when explicitly requested.

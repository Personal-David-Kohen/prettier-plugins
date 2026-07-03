# prettier-plugins

Small Prettier plugins for pyramid-style code standards:

- `prettier-plugin-pyramid-imports` — imports
- `prettier-plugin-pyramid-interface-keys` — TypeScript interface members
- `prettier-plugin-pyramid-jsx-attributes` — JSX attributes, including spread precedence

When combining them, list the plugins in that order. The interface and JSX plugins
cooperatively run earlier parser preprocessors, so all three rules are applied.

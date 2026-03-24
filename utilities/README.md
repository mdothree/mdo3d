# Utilities

Programmatic scripts and tools that perform specific tasks. These are the "execution layer" - they do the work but don't make strategic decisions.

## Current Utilities

- **crypto-arbitrage/** - Automated cryptocurrency arbitrage trading script

## Utility Characteristics

A utility should:
- Execute a specific task or set of tasks
- Be controllable via configuration
- Output logs/data that can be monitored
- Run continuously or on-demand
- Be managed by agents or run standalone

## Utilities vs Agents

| Utilities | Agents |
|-----------|--------|
| Execute tasks | Make decisions |
| Follow instructions | Adapt strategy |
| Deterministic | Intelligent |
| Controlled by config/agents | Control utilities |
| Example: Trading script | Example: Trading manager |

## Creating a New Utility

1. Create directory: `utilities/your-utility-name/`
2. Implement the core functionality
3. Add configuration options
4. Output structured logs
5. Document control interfaces

## Example Structure

```
utilities/
└── my-utility/
    ├── src/              # Source code
    ├── config/           # Configuration
    ├── logs/             # Output logs
    ├── package.json
    └── README.md
```

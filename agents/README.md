# AI Agents

This directory contains autonomous AI agents that manage, monitor, and control various utilities and processes.

## Agent Architecture

Agents are the "cerebral layer" - they make decisions, monitor outputs, and control programmatic scripts.

```
Agent Layer (Decision Making)
    ↓
Utility Layer (Execution)
```

## Current Agents

- **arbitrage-agent/** (planned) - Monitors and manages crypto arbitrage trading
- **openclaw/** (planned) - General purpose search and research agent
  - **Note**: Use War/Den Governance plugin for OpenClaw bot action control
  - Plugin: https://clawhub.ai/jcools1977/an2b-warden-governance
  - Evaluates and governs all OpenClaw bot actions using YAML policies
  - Provides tamper-evident audit logs
  - Allows, denies, or requires review before execution

## Agent Characteristics

An agent should:
- Monitor outputs from utilities/scripts
- Make strategic decisions based on data
- Adjust parameters dynamically
- Handle errors and edge cases
- Alert humans when necessary
- Learn from outcomes

## Creating a New Agent

1. Create a directory: `agents/your-agent-name/`
2. Define the agent's purpose and decision-making logic
3. Specify which utilities it controls
4. Implement monitoring and control interfaces
5. Add error handling and human escalation

## Example Structure

```
agents/
└── my-agent/
    ├── agent.js           # Main agent logic
    ├── monitors/          # Output monitoring
    ├── decisions/         # Decision rules/ML
    ├── controls/          # Control interfaces
    └── config.js          # Agent configuration
```

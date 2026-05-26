# Claude Code Agent

A minimal CLI agent that gives an LLM access to your filesystem and shell. Built with Node.js and OpenRouter.

## What it does

You pass in a prompt, the agent runs a conversation loop with the model, and the model can read files, write files, and execute bash commands to complete the task.

## Tools

| Tool    | What it does                                              |
| ------- | --------------------------------------------------------- |
| `read`  | Reads a file (or lists a directory)                       |
| `write` | Writes content to a file, creating it if it doesn't exist |
| `bash`  | Runs a shell command and returns stdout/stderr            |

## Setup

```bash
npm install
export OPENROUTER_API_KEY=your_key_here
```

## Usage

```bash
node app/main.js -p "your prompt here"
```

### Examples

```bash
# Read a file and summarize it
node app/main.js -p "Summarize README.md"

# Create a file based on instructions
node app/main.js -p "Read README.md and create the file it describes"

# Run shell tasks
node app/main.js -p "Delete README_old.md"
```

## Environment Variables

| Variable              | Required | Default                        |
| --------------------- | -------- | ------------------------------ |
| `OPENROUTER_API_KEY`  | Yes      | —                              |
| `OPENROUTER_BASE_URL` | No       | `https://openrouter.ai/api/v1` |

## Model

Uses `anthropic/claude-haiku-4.5` via OpenRouter by default. Change the `model` variable in `main.js` to swap it out.

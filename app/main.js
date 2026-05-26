import OpenAI from "openai";
import { readFileSync } from "fs";

async function main() {
  const [, , flag, prompt] = process.argv;
  const API_KEY = process.env.OPENROUTER_API_KEY;
  const BASE_URL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("error: -p flag is required");
  }

  const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: BASE_URL,
  });

  const TOOLS = [
    {
      type: "function",
      function: {
        name: "Read",
        description: "Read and return the contents of a file",
        parameters: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "The path to the file read",
            },
          },
        },
      },
    },
  ];

  const TOOL_CALLS = [
    {
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "abc_123",
                type: "function",
                function: {
                  name: "Read",
                  arguments: '{"file_path": "/path/to/file.txt"}',
                },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
    },
  ];

  const MODEL = "anthropic/claude-haiku-4.5";

  let messages = [
    {
      role: "user",
      content: "Summarize the README for me.",
      tools: [{ type: "Read" }],
    },
  ];

  async function getResponse(messages) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: messages,
      tools: TOOLS,
      tool_calls: TOOL_CALLS,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
    }

    const assistant_message = response.choices[0].message;
    const tool_calls = assistant_message.tool_calls;

    if (!tool_calls || tool_calls.length === 0) {
      console.log(assistant_message.content);
      return;
    }

    if (tool_name !== "read") {
      console.log(assistant_message.content);
      return;
    }

    const tool_name = tool_calls[0].function.name;

    const { file_path } = JSON.parse(tool_calls[0].function.arguments);
    const file_content = readFileSync(file_path, "utf8");

    messages.push(assistant_message, {
      role: "tool",
      tool_call_id: tool_calls[0].id,
      content: file_content,
    });

    await getResponse(messages);
  }
}

main();

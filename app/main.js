import OpenAI from "openai";
import fs from "fs";
import path from "path";

async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("error: -p flag is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  const model = "anthropic/claude-haiku-4.5";

  const tools = [
    {
      type: "function",
      function: {
        name: "read",
        description: "read and return contents of a file",
        parameters: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "path to a file to read",
            },
          },
          required: ["file_path"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "write",
        description: "Write content to a file",
        parameters: {
          type: "object",
          required: ["file_path", "content"],
          properties: {
            file_path: {
              type: "string",
              description: "The path of the file to write to",
            },
            content: {
              type: "string",
              description: "The content to write to the file",
            },
          },
        },
      },
    },
  ];

  const messages = [{ role: "user", content: prompt }];

  await get_response(model, messages, tools);

  async function get_response(model, messages, tools) {
    const response = await client.chat.completions.create({
      model: model,
      messages: messages,
      tools: tools,
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

    const tool_name = tool_calls[0].function.name;
    const { file_path } = JSON.parse(tool_calls[0].function.arguments);

    if (tool_name == "write") {
      const result = await writeFile(file_path, assistant_message.content);
      messages.push(assistant_message, {
        role: "tool",
        tool_call_id: tool_calls[0].id,
        content: result,
      });
    } else if (tool_name == "read") {
      const result = await readFile(file_path);
      messages.push(assistant_message, {
        role: "tool",
        tool_call_id: tool_calls[0].id,
        content: result,
      });
    } else {
      console.log(assistant_message.content);
      return;
    }

    await get_response(model, messages, tools);
  }

  async function readFile(filePath) {
    const file_content = fs.readFileSync(filePath, "utf8");

    return file_content;
  }

  async function writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");

    return `Successfully wrote to ${filePath}`;
  }
}

main();

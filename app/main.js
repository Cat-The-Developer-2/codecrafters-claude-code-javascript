import OpenAI from "openai";
import fs from "fs";
import path from "path";

async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  if (flag !== "-p" || !prompt) throw new Error("error: -p flag is required");

  const client = new OpenAI({ apiKey, baseURL });

  const model = "anthropic/claude-haiku-4.5";

  const tools = [
    {
      type: "function",
      function: {
        name: "read",
        description:
          "Read and return the contents of a file. file_path must point to a file, not a directory.",
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

  const messages = [
    {
      role: "system",
      content:
        "When using the write tool, the content parameter must contain only the raw file content. No explanations, no preamble, no markdown — just the exact bytes to write to the file.",
    },
    { role: "user", content: prompt },
  ];

  await get_response(model, messages, tools);

  async function get_response(model, messages, tools) {
    const response = await client.chat.completions.create({
      model,
      messages,
      tools,
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

    // FIX 1: loop over all tool calls, not just [0]
    const toolResults = [];
    for (const tool_call of tool_calls) {
      const tool_name = tool_call.function.name;
      // FIX 2: destructure content from args, not assistant_message.content
      const args = JSON.parse(tool_call.function.arguments);

      let result;
      if (tool_name === "write") {
        result = await writeFile(args.file_path, args.content);
      } else if (tool_name === "read") {
        result = await readFile(args.file_path);
      } else {
        result = `Unknown tool: ${tool_name}`;
      }

      toolResults.push({
        role: "tool",
        tool_call_id: tool_call.id,
        content: result,
      });
    }

    messages.push(assistant_message, ...toolResults);
    await get_response(model, messages, tools);
  }

  function readFile(filePath) {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(filePath);
      return `Directory listing for ${filePath}:\n${entries.join("\n")}`;
    }
    return fs.readFileSync(filePath, "utf8");
  }

  function writeFile(filePath, content) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
    return `Successfully wrote to ${filePath}`;
  }
}

main();

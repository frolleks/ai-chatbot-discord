import { HfInference } from "@huggingface/inference";
import { HuggingFaceStream, StreamingTextResponse } from "ai";

import * as dotenv from "dotenv";

dotenv.config();

const Hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

function buildOpenAssistantPrompt(messages) {
  return (
    messages
      .map(({ content, role }) => {
        if (role === "user") {
          return `<|prompter|>${content}<|endoftext|>`;
        } else {
          return `<|assistant|>${content}<|endoftext|>`;
        }
      })
      .join("") + "<|assistant|>"
  );
}

export default {
  data: {
    name: "talk",
    description: "Talk with the AI!",
    options: [
      {
        name: "text",
        type: 3,
        description: "Text to talk to the AI with",
        required: true,
      },
    ],
  },
  async execute(interaction) {
    const content = interaction.options.getString("text");

    const response = await Hf.textGenerationStream({
      model: "OpenAssistant/oasst-sft-4-pythia-12b-epoch-3.5",
      inputs: buildOpenAssistantPrompt([{ content, role: "user" }]),
      parameters: {
        max_new_tokens: 200,
        typical_p: 0.2,
        repetition_penalty: 1,
        truncate: 1000,
        return_full_text: false,
      },
    });

    const stream = HuggingFaceStream(response);
    const textDecoder = new TextDecoder();

    // Send initial response
    await interaction.reply("Processing...");

    let responseText = "";

    // Setup an interval to update the message every 5 seconds
    const updateInterval = setInterval(async () => {
      await interaction.editReply(responseText.slice(0, 2000)); // Discord messages have a 2000 character limit
    }, 5000); // Every 5 seconds

    // Process the stream
    for await (const chunk of stream) {
      responseText += textDecoder.decode(chunk);
    }

    // One final update after stream has ended
    clearInterval(updateInterval);
    await interaction.editReply(responseText.slice(0, 2000));
  },
};

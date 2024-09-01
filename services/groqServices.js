const Groq = require("groq-sdk");

// Initialize Groq SDK with your API key
const groq = new Groq({
  apiKey: "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",
});

async function generateText(model, prompt) {
  const response = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: model,
  });
  return response.choices[0]?.message?.content || "";
}

module.exports = { generateText };

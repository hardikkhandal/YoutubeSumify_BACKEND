const express = require("express");
const router = express.Router();
const { generateText } = require("../services/groqServices");

router.post("/generate", async (req, res) => {
  const { model, prompt } = req.body;
  console.log("Received request to generate text:", { model, prompt });

  try {
    const generatedText = await generateText(model, prompt);
    res.json({ generatedText: generatedText.trim() });
  } catch (error) {
    console.error("Error calling the Groq API:", error.message);
    res
      .status(500)
      .json({ error: "Failed to predict output", details: error.message });
  }
});

module.exports = router;

hehehehe;

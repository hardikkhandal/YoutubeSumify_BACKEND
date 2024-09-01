const express = require("express");
const { getTranscript } = require("youtube-transcript-api");
const { generateText } = require("../services/groqServices");
const { extractVideoId } = require("../helpers/extractVideoId");

const router = express.Router();
router.get("/summarize", (req, res) => {
  console.log("Hello");
});
router.post("/summarize", async (req, res) => {
  try {
    console.log("Request body:", req.body);
    const { videoUrl } = req.body;
    console.log("Request received to summarize video:", videoUrl);
    const videoId = extractVideoId(videoUrl);

    const transcript = await getTranscript(videoId, { timeout: 60000 });
    const transcriptText = transcript.map((entry) => entry.text).join(" ");
    console.log("Fetched transcript:", transcriptText);

    const prompt = `Summarize the video at the following URL: ${videoUrl}. Transcript: ${transcriptText} in few words`;
    const summary = await generateText("llama3-8b-8192", prompt);

    res.json({ summary: summary.trim() });
  } catch (error) {
    console.error("Error summarizing video:", error.message);
    res.status(500).json({ error: "Failed to summarize video" });
  }
});

module.exports = router;

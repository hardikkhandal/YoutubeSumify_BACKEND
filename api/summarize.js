const express = require("express");
const { YoutubeTranscript } = require("youtube-transcript");
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

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    // Extract only the text from each transcript entry
    const transcriptText = transcript.map((entry) => entry.text).join(" ");
    console.log("Fetched transcript:", transcriptText);

    const prompt = `Summarize the video at the following URL: ${videoUrl}. Transcript: ${transcriptText} in few words`;

    // Call your generateText function with the prompt
    const summary = await generateText("llama3-8b-8192", prompt);

    // Send the summary response
    res.json({ summary: summary.trim() });
  } catch (error) {
    console.error("Error summarizing video:", error.message);
    res.status(500).json({ error: "Failed to summarize video" });
  }
});

module.exports = router;

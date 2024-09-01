const express = require("express");
const { YoutubeTranscript } = require("youtube-transcript");
const { generateText } = require("../services/groqServices");
const { extractVideoId } = require("../helpers/extractVideoId");

const router = express.Router();

router.post("/question", async (req, res) => {
  const { message, videoUrl } = req.body;

  console.log("Received question on question.js:", message);

  try {
    const videoId = extractVideoId(videoUrl);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    // Extract only the text from each transcript entry
    const transcriptText = transcript.map((entry) => entry.text).join(" ");

    const prompt = `${message} from the youtube url ${videoUrl} and having transcript ${transcriptText}. Only tell answer in shortest sentence`;
    const answer = await generateText("llama3-8b-8192", prompt);

    console.log(answer);
    console.log(videoUrl);
    res.json({ answer: answer.trim() });
  } catch (error) {
    console.error("Error generating answer:", error.message);
    res.status(500).json({ error: "Failed to generate answer" });
  }
});

module.exports = router;

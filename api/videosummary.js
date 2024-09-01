const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");

// Initialize Google Text-to-Speech client
const client = new TextToSpeechClient();

router.use(bodyParser.json());

// Helper function to wait for the video to be created
function waitForVideoCreation(videoFile) {
  return new Promise((resolve, reject) => {
    const checkInterval = 1000; // Check every 1 second

    const checkFileExistence = setInterval(() => {
      if (fs.existsSync(videoFile)) {
        clearInterval(checkFileExistence);
        resolve();
      }
    }, checkInterval);

    // Timeout after 60 seconds
    setTimeout(() => {
      clearInterval(checkFileExistence);
      reject(new Error("Video creation timeout"));
    }, 60000);
  });
}

// Endpoint to create video summary
router.post("/create-video-summary", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  const audioFile = path.join(__dirname, "output.mp3");
  const videoFile = path.join(__dirname, "summary.mp4");

  try {
    // Generate speech from text
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
      audioConfig: { audioEncoding: "MP3" },
    });

    fs.writeFileSync(audioFile, response.audioContent, "binary");

    // Generate video with text overlay
    await new Promise((resolve, reject) => {
      ffmpeg()
        .setFfmpegPath(ffmpegStatic)
        .input("color=c=black:s=640x360:d=10") // Placeholder for video
        .input(audioFile)
        .audioCodec("aac")
        .videoCodec("libx264")
        .outputOptions([
          "-vf drawtext=\"text='Summary':fontcolor=white:fontsize=24:x=(w-tw)/2:y=(h-th)/2\"",
          "-pix_fmt yuv420p",
        ])
        .on("end", () => {
          console.log("Video generation complete");
          fs.unlinkSync(audioFile); // Clean up audio file
          resolve();
        })
        .on("error", (err) => {
          console.error("Error during video generation:", err);
          reject(err);
        })
        .save(videoFile);
    });

    // Wait for video file to be ready
    await waitForVideoCreation(videoFile);

    res.json({ videoUrl: `https://your-server-domain.com/summary.mp4` });
  } catch (error) {
    console.error("Error creating video summary:", error);
    res.status(500).json({ error: "Failed to create video summary" });
  }
});

module.exports = router;

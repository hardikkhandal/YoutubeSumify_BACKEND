const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const { YoutubeTranscript } = require("youtube-transcript");
const { generateText } = require("../services/groqServices");
const { extractVideoId } = require("../helpers/extractVideoId");

// Replace with your Eleven Labs API key and voice ID
const API_KEY = "sk_463348fa85af75bd647633b9d6049d312152c9f5025763ff";
const VOICE_ID = "pMsXgVXv3BLzUgSXRplE"; // Example voice ID

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
  console.log("Request body:", req.body);
  const { videoUrl } = req.body;
  console.log("Request received to summarize video:", videoUrl);
  const videoId = extractVideoId(videoUrl);

  const transcript = await YoutubeTranscript.fetchTranscript(videoId);

  // Extract only the text from each transcript entry
  const text = transcript.map((entry) => entry.text).join(" ");

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  // Define file paths directly
  const audioDir = "audio";
  const audioFile = `${audioDir}/output.mp3`;
  const videoFile = `${audioDir}/summary.mp4`;

  // Ensure the audio directory exists or create it if it doesn't
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
  }

  try {
    // Generate speech from text using Eleven Labs API
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      },
      {
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
        },
        responseType: "arraybuffer", // Ensure response is in binary format
      }
    );

    // Save audio file
    fs.writeFileSync(audioFile, Buffer.from(response.data));
    console.log("Audio file saved successfully.");

    // // Generate video with text overlay
    // await new Promise((resolve, reject) => {
    //   ffmpeg()
    //     .setFfmpegPath(ffmpegStatic)
    //     .input("color=c=black:s=640x360:d=10") // Placeholder for video
    //     .input(audioFile)
    //     .audioCodec("aac")
    //     .videoCodec("libx264")
    //     .outputOptions([
    //       "-vf drawtext=text='Summary':fontcolor=white:fontsize=24:x=(w-tw)/2:y=(h-th)/2",
    //       "-pix_fmt yuv420p",
    //     ])
    //     .on("end", () => {
    //       console.log("Video generation complete");
    //       fs.unlinkSync(audioFile); // Clean up audio file
    //       resolve();
    //     })
    //     .on("error", (err) => {
    //       console.error("Error during video generation:", err);
    //       reject(err);
    //     })
    //     .save(videoFile);
    // });

    // // Wait for video file to be ready
    // await waitForVideoCreation(videoFile);

    // res.json({ videoUrl: `https://your-server-domain.com/${videoFile}` });
  } catch (error) {
    console.error("Error creating video summary:", error);
    res.status(500).json({ error: "Failed to create video summary" });
  }
});

module.exports = router;

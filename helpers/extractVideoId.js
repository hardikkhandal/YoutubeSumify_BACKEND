function extractVideoId(url) {
  const videoId = url.split("v=")[1];
  if (!videoId) {
    throw new Error("Invalid YouTube URL. Unable to extract video ID.");
  }
  const ampersandPosition = videoId.indexOf("&");
  if (ampersandPosition !== -1) {
    return videoId.substring(0, ampersandPosition);
  }
  return videoId;
}

module.exports = { extractVideoId };

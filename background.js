// background.js
// background.js (top of file)
importScripts('config.js');

// Example distractors
const defaultDistractors = ["youtube.com", "facebook.com", "twitter.com", "instagram.com"];

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    // Grab user settings from storage
    chrome.storage.sync.get(["blockingEnabled", "userGoal"], (data) => {
      const blockingEnabled = data.blockingEnabled ?? true;
      const userGoal = data.userGoal || "";
      if (!blockingEnabled) return;

      const currentUrl = tab.url || "";

      // If the user is obviously on a distractor domain, or we can do an AI check
      if (isKnownDistractor(currentUrl) || needAiCheck(userGoal, currentUrl)) {
        // Optionally do an AI check. Or we can skip if we just do domain-based blocking
        doAiCheckIfNeeded(tabId, currentUrl, userGoal);
      }
    });
  }
});

function isKnownDistractor(url) {
  const lowerUrl = url.toLowerCase();
  return defaultDistractors.some(site => lowerUrl.includes(site));
}

function needAiCheck(goal, url) {
  // For demonstration, let's say if the user has a goal set, we do an AI check
  // or do a naive check if the URL doesn't match the goal
  const lowerUrl = url.toLowerCase();
  const lowerGoal = goal.toLowerCase();
  return (goal && !lowerUrl.includes(lowerGoal));
}

async function doAiCheckIfNeeded(tabId, url, goal) {
  // 1) Capture a screenshot
  chrome.tabs.captureVisibleTab(null, { format: "png" }, async (dataUrl) => {
    if (!dataUrl) {
      // fallback: just send message to content script
      chrome.tabs.sendMessage(tabId, { type: "OFF_TASK_WARNING", payload: { url, goal } });
      return;
    }
    const base64Image = dataUrl.replace(/^data:image\/png;base64,/, "");

    // 2) Call the AI endpoint with the config from config.js
    // e.g. "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=YOURKEY"
    const endpointUrl = `${AI_BASE_URL}?key=${AI_API_KEY}`;

    // Build a minimal request body for "gemini-2.0-flash" style
    const promptText = `
We have a user whose goal is "${goal}". They appear to be visiting "${url}".
Screenshot is attached as base64. Decide if they're on-task or off-task.
Reply with "pass" or "fail" only.
`.trim();

    const requestBody = {
      model: AI_MODEL_NAME,
      temperature: 0.0,
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: base64Image } }
          ]
        }
      ]
    };

    try {
      const res = await fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      if (!res.ok) throw new Error(`${res.status} - ${await res.text()}`);
      const data = await res.json();
      if (!data.choices || data.choices.length === 0) throw new Error("No choices from AI");
      const result = data.choices[0].message.content.trim().toLowerCase();

      if (result === "fail") {
        // The AI says they're off-task
        chrome.tabs.sendMessage(tabId, {
          type: "OFF_TASK_WARNING",
          payload: { url, goal, aiResult: result }
        });
      }
      // if "pass", do nothing
    } catch (err) {
      console.error("AI check failed:", err);
      // fallback: warn user
      chrome.tabs.sendMessage(tabId, { type: "OFF_TASK_WARNING", payload: { url, goal } });
    }
  });
}

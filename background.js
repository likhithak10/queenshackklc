// background.js

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

      // If the user is obviously on a distractor domain, or we need an AI check
      if (isKnownDistractor(currentUrl) || needAiCheck(userGoal, currentUrl)) {
        doAiCheckIfNeeded(tabId, currentUrl, userGoal);
      }
    });
  }
});

function isKnownDistractor(url) {
  const lowerUrl = url.toLowerCase();
  return defaultDistractors.some(site => lowerUrl.includes(site));
}

// Check if the URL is related to the user's goal
function needAiCheck(goal, url) {
  const lowerUrl = url.toLowerCase();
  const lowerGoal = goal.toLowerCase();

  // If the goal exists and the URL doesn't contain the exact goal word, we check for related topics
  if (goal && !lowerUrl.includes(lowerGoal)) {
    // Define a list of related terms based on the user's goal
    const relatedTerms = getRelatedTerms(goal);
    return !relatedTerms.some(term => lowerUrl.includes(term));
  }
  return false; // If the URL already contains the goal, no need to block
}

// Get related terms for the goal
function getRelatedTerms(goal) {
  const relatedKeywords = {
    "calculus": ["math", "algebra", "geometry", "trigonometry", "maths", "functions", "integration", "differentiation"],
    "history": ["historical", "civilization", "ancient", "war", "history", "timeline"],
    "biology": ["bio", "science", "genetics", "evolution", "cells", "microbiology", "ecology"],
    "programming": ["code", "developer", "python", "javascript", "software", "algorithms"]
  };

  // Return the relevant related terms based on the goal
  return relatedKeywords[goal.toLowerCase()] || [];
}

async function doAiCheckIfNeeded(tabId, url, goal) {
  // Capture screenshot and make AI request as shown earlier
  chrome.tabs.captureVisibleTab(null, { format: "png" }, async (dataUrl) => {
    if (!dataUrl) return;
    const base64Image = dataUrl.replace(/^data:image\/png;base64,/, "");

    const endpointUrl = `${AI_BASE_URL}?key=${AI_API_KEY}`;
    const promptText = `
      We have a user whose goal is "${goal}". They appear to be visiting "${url}".
      Screenshot is attached as base64. Decide if they're on-task or off-task.
      Reply with "pass" or "fail" only.`;

    const requestBody = {
      model: AI_MODEL_NAME,
      temperature: 0.0,
      max_tokens: 10,
      messages: [
        { role: "user", content: promptText },
        { role: "user", content: base64Image }
      ]
    };

    try {
      const res = await fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) throw new Error(`API Error: ${res.status}`);

      const data = await res.json();
      if (data.choices && data.choices.length > 0) {
        const result = data.choices[0].message.content.trim().toLowerCase();
        if (result === "fail") {
          chrome.tabs.sendMessage(tabId, {
            type: "OFF_TASK_WARNING",
            payload: { url, goal, aiResult: result }
          });
        }
      } else {
        console.error("AI did not return valid choices.");
      }
    } catch (error) {
      console.error("AI check failed:", error);
      chrome.tabs.sendMessage(tabId, { type: "OFF_TASK_WARNING", payload: { url, goal } });
    }
  });
}

console.log("RocketFocus background is active!");

// Tracking state
let currentSession = null;
let lastCaptureTime = 0;
let isTracking = false;
let currentGoal = "";
let tabHistory = {};

// Listen for start/stop tracking
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "startTracking") {
    isTracking = true;
    currentGoal = message.goal;
    console.log(`Tracking started with mission: ${currentGoal}`);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        if (
          activeTab.url &&
          !activeTab.url.startsWith("chrome://") &&
          !activeTab.url.startsWith("about:")
        ) {
          beginSession(activeTab.id, activeTab.url);
        } else {
          console.warn("Active tab is invalid for tracking.");
        }
      } else {
        console.warn("No active tab found to start tracking.");
      }
    });

    sendResponse({ success: true, goal: currentGoal });
  } else if (message.type === "stopTracking") {
    isTracking = false;
    console.log("Tracking ended.");
    endSession();
    sendResponse({ success: true });
  } else if (message.type === "getTrackingState") {
    sendResponse({ isTracking, goal: currentGoal });
  }
});

// Monitor tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isTracking && changeInfo.status === "complete" && tab.url) {
    console.log(`Tab updated: ${tab.url}`);
    recordTabHistory(tabId, tab.url);
    beginSession(tabId, tab.url);

    // Trigger rocket animation on the new page
    chrome.tabs.sendMessage(tabId, { action: "rocketArrives" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending rocketArrives:", chrome.runtime.lastError);
      } else {
        console.log(response?.status || "Rocket arrives message sent");
      }
    });
  }
});

// Monitor new tabs
chrome.tabs.onCreated.addListener((tab) => {
  if (isTracking) {
    console.log(`New tab: ${tab.id}, URL = ${tab.url || "about:blank"}`);
    recordTabHistory(tab.id, tab.url || "about:blank");
    beginSession(tab.id, tab.url || "about:blank");

    // Animate rocket on new tab
    chrome.tabs.sendMessage(tab.id, { action: "rocketArrives" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending rocketArrives:", chrome.runtime.lastError);
      } else {
        console.log(response?.status || "Rocket arrives message sent");
      }
    });
  }
});

// Monitor tab switching
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (isTracking) {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      console.log(`Switched to tab ${activeInfo.tabId}: ${tab.url}`);
      recordTabHistory(activeInfo.tabId, tab.url);
      beginSession(activeInfo.tabId, tab.url);

      // Animate rocket on tab switch
      chrome.tabs.sendMessage(activeInfo.tabId, { action: "rocketArrives" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending rocketArrives:", chrome.runtime.lastError);
        } else {
          console.log(response?.status || "Rocket arrives message sent");
        }
      });
    });
  }
});

// Record tab history
function recordTabHistory(tabId, url) {
  if (!url || url.startsWith("chrome://") || url.startsWith("about:")) {
    return;
  }
  if (!tabHistory[tabId]) {
    tabHistory[tabId] = [];
  }
  const history = tabHistory[tabId];
  if (history.length === 0 || history[history.length - 1] !== url) {
    tabHistory[tabId].push(url);
    console.log(`Tab ${tabId} history updated:`, tabHistory[tabId]);
  }
}

// Start a new session
function beginSession(tabId, url) {
  endSession(); // End any existing session first
  if (!url || url.startsWith("chrome://") || url.startsWith("about:")) {
    console.log(`Skipping session for restricted URL: ${url}`);
    return;
  }
  currentSession = { tabId, url, sessionId: Date.now() };
  console.log(`Session started for tab ${tabId}, URL = ${url}`);

  setTimeout(() => {
    if (currentSession && currentSession.tabId === tabId) {
      captureScreenshot(url, currentSession.sessionId);
    } else {
      console.log("Session ended before screenshot capture.");
    }
  }, 4000);
}

// End the current session
function endSession() {
  if (currentSession) {
    console.log(`Session ended for tab ${currentSession.tabId}`);
    currentSession = null;
  }
}

// Take a screenshot
function captureScreenshot(url, sessionId) {
  const now = Date.now();
  if (now - lastCaptureTime < 1000) {
    console.warn("Skipping screenshot to avoid rate limit.");
    return;
  }
  lastCaptureTime = now;

  chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error("Screenshot error:", chrome.runtime.lastError.message);
      return;
    }
    console.log(`Screenshot captured for ${url}`);
    analyzeScreenshot(dataUrl, currentGoal, sessionId);
  });
}

/**
 * Call the Gemini (OpenAI client) endpoint to analyze the screenshot
 */
function analyzeScreenshot(base64Screenshot, goal, sessionId) {
  if (!currentSession || currentSession.sessionId !== sessionId) {
    console.log("Session ended or replaced, ignoring screenshot analysis.");
    return;
  }

  // If running locally, use "http://localhost:8080/analyze_screenshot"
  fetch("http://localhost:8080/analyze_screenshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base64Screenshot,
      goal
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!currentSession || currentSession.sessionId !== sessionId) {
        console.log("Session ended after analysis started, ignoring result.");
        return;
      }
      if (data) {
        const offTaskScore = parseInt(data, 10);
        console.log("Off-task score:", offTaskScore);
        if (offTaskScore > 70) {
          handleSevereOffTask(currentSession.tabId);
        } else if (offTaskScore >= 30) {
          handleModerateOffTask(currentSession.tabId, base64Screenshot, goal);
        } else {
          // Not off-task: remove any overlay or rocket bubble
          chrome.tabs.sendMessage(currentSession.tabId, { action: "removeThoughtBubble" }, () => {
            if (chrome.runtime.lastError) {
              console.error("removeThoughtBubble error:", chrome.runtime.lastError);
            } else {
              console.log("Thought bubble removed (user on-task).");
            }
          });
        }
      } else {
        console.error("No valid score returned:", data);
      }
    })
    .catch((err) => {
      console.error("Error calling screenshot analysis:", err);
    });
}

function handleSevereOffTask(tabId) {
  console.log(`Severe off-task detected for tab ${tabId}`);
  // Show a GIF, then redirect or close
  let rocketGif = "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3FjN2ZrZjNwNnp6bzFoMDBxY251aDB2dDZ1MXZiaXluODg0ZXV1bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l4KhQo2MESJkc6QbS/giphy.gif"; // sample
  if (tabHistory[tabId] && tabHistory[tabId].length > 1) {
    const prevUrl = tabHistory[tabId][tabHistory[tabId].length - 2];
    injectGif(tabId, rocketGif);
    setTimeout(() => {
      chrome.tabs.update(tabId, { url: prevUrl });
    }, 2000);
  } else {
    injectGif(tabId, rocketGif);
    setTimeout(() => {
      chrome.tabs.remove(tabId);
    }, 2000);
  }
}

function handleModerateOffTask(tabId, base64Screenshot, goal) {
  console.log(`Moderate off-task for tab ${tabId}`);
  // Insert an overlay, ask user to explain
  chrome.scripting.executeScript({
    target: { tabId },
    func: injectOverlay,
  });

  // Listen for user's overlay response
  chrome.runtime.onMessage.addListener(function overlayResponse(msg, sender) {
    if (msg.type === "overlayResponse" && sender.tab.id === tabId) {
      chrome.runtime.onMessage.removeListener(overlayResponse);
      const userReason = msg.response;

      // If running locally: "http://localhost:8080/validate_reason"
      fetch("http://localhost:8080/validate_reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Screenshot,
          goal,
          reason: userReason,
        }),
      })
        .then((res) => res.json())
        .then((validation) => {
          console.log("User reason validation:", validation);
          if (String(validation).toUpperCase() === "PASS") {
            console.log("User is allowed. Removing overlay.");
            chrome.scripting.executeScript({
              target: { tabId },
              func: removeOverlay,
            });
            // Also remove the rocket bubble
            chrome.tabs.sendMessage(tabId, { action: "removeThoughtBubble" }, () => {
              if (chrome.runtime.lastError) {
                console.error("Error removing bubble:", chrome.runtime.lastError);
              }
            });
          } else {
            console.log("User reason failed. Forcing them off page.");
            handleSevereOffTask(tabId);
          }
        })
        .catch((error) => {
          console.error("Error validating user reason:", error);
          handleSevereOffTask(tabId);
        });
    }
  });
}

// Inject a distracting overlay
function injectOverlay() {
  const body = document.body;
  const overlay = document.createElement("div");
  overlay.id = "rocketOverlay";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0,0,0,0.7)";
  overlay.style.zIndex = 999999;
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.color = "#fff";
  overlay.style.fontSize = "18px";

  const prompt = document.createElement("p");
  prompt.textContent = "Explain why you need this page:";
  const input = document.createElement("textarea");
  input.style.width = "80%";
  input.style.height = "80px";
  input.style.marginTop = "20px";
  const submitBtn = document.createElement("button");
  submitBtn.textContent = "Submit";
  submitBtn.style.marginTop = "20px";

  overlay.appendChild(prompt);
  overlay.appendChild(input);
  overlay.appendChild(submitBtn);
  body.appendChild(overlay);

  submitBtn.addEventListener("click", () => {
    const userResponse = input.value.trim();
    if (userResponse) {
      chrome.runtime.sendMessage({ type: "overlayResponse", response: userResponse });
      body.removeChild(overlay);
    }
  });
}

// Remove the overlay
function removeOverlay() {
  const overlay = document.getElementById("rocketOverlay");
  if (overlay) {
    overlay.remove();
  }
}

// Inject a GIF
function injectGif(tabId, gifUrl) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (url) => {
      const body = document.body;
      const gif = document.createElement("img");
      gif.src = url;
      gif.style.position = "fixed";
      gif.style.top = "50%";
      gif.style.left = "50%";
      gif.style.width = "100vw";
      gif.style.height = "100vh";
      gif.style.objectFit = "cover";
      gif.style.transform = "translate(-50%, -50%)";
      gif.style.zIndex = "9999999";
      gif.style.pointerEvents = "none";
      body.appendChild(gif);
    },
    args: [gifUrl],
  });
}

/* --------------------------------------------------------
   POMODORO TIMER LOGIC ADDED HERE
   -------------------------------------------------------- */

let pomodoroInterval = null;
let pomodoroRemainingTime = 1500; // 25 minutes
let pomodoroStatus = "stopped";   // "stopped", "running", "paused"

// Listen for Pomodoro messages from popup.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "startPomodoro") {
    if (pomodoroStatus !== "running") {
      pomodoroStatus = "running";
      startPomodoroCountdown();
    }
    sendResponse({ success: true });
  } else if (msg.type === "pausePomodoro") {
    if (pomodoroStatus === "running") {
      pomodoroStatus = "paused";
      clearInterval(pomodoroInterval);
    }
    sendResponse({ success: true });
  } else if (msg.type === "resumePomodoro") {
    if (pomodoroStatus === "paused") {
      pomodoroStatus = "running";
      startPomodoroCountdown();
    }
    sendResponse({ success: true });
  } else if (msg.type === "resetPomodoro") {
    pomodoroStatus = "stopped";
    clearInterval(pomodoroInterval);
    pomodoroRemainingTime = 1500; // reset to 25 mins
    sendResponse({ success: true });
  } else if (msg.type === "getPomodoroStatus") {
    sendResponse({
      success: true,
      remainingTime: pomodoroRemainingTime,
      status: pomodoroStatus,
    });
  }
});

// Start the countdown
function startPomodoroCountdown() {
  clearInterval(pomodoroInterval);
  pomodoroInterval = setInterval(() => {
    if (pomodoroRemainingTime > 0) {
      pomodoroRemainingTime--;
    } else {
      clearInterval(pomodoroInterval);
      pomodoroStatus = "stopped";
      // Notify user that time is up
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Pomodoro Timer",
        message: "Time’s up! Great job!",
        priority: 2
      });
    }
  }, 1000);
}


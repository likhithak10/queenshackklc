document.addEventListener("DOMContentLoaded", () => {
  const goalContainer = document.getElementById("goalContainer");
  const timerContainer = document.getElementById("timerContainer");

  // ----- Existing Tracking & UI Code ----- //
  chrome.runtime.sendMessage({ type: "getTrackingState" }, (response) => {
    if (response.isTracking) {
      displayActiveGoal(response.goal);
    } else {
      displayGoalInput();
    }
  });

  function displayGoalInput() {
    goalContainer.innerHTML = `
      <h1 class="space-title">Space Explorer</h1>
      <p class="space-paragraph">Set your mission goal for this session:</p>
      <input type="text" id="goalInput" class="space-input" placeholder="e.g., Complete my essay..." />
      <button id="startBtn" class="space-button">Start Mission</button>
      <p id="statusMessage" class="space-status"></p>
    `;
    document.getElementById("startBtn").addEventListener("click", () => {
      const goalInput = document.getElementById("goalInput").value.trim();
      if (goalInput === "") {
        updateStatusMessage("Please enter a valid mission goal!", "red");
        return;
      }
      chrome.runtime.sendMessage({ type: "startTracking", goal: goalInput }, (response) => {
        if (response.success) {
          displayActiveGoal(response.goal);
          sendSpaceshipToWebpage();
        } else {
          updateStatusMessage("Mission failed to start. Try again!", "red");
        }
      });
    });
  }

  function displayActiveGoal(goal) {
    goalContainer.innerHTML = `
      <h1 class="space-title">Current Mission:</h1>
      <p class="space-paragraph">${goal}</p>
      <button id="stopBtn" class="space-button">Mission Complete</button>
      <p id="statusMessage" class="space-status"></p>
    `;
    document.getElementById("stopBtn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "stopTracking" }, (response) => {
        if (response.success) {
          sendSpaceshipAwayToAllWebpages();
          displayGoalInput();
        } else {
          updateStatusMessage("Mission failed to stop. Try again!", "red");
        }
      });
    });
  }

  function updateStatusMessage(message, color) {
    const statusMessage = document.getElementById("statusMessage");
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.style.color = color;
  }

  function sendSpaceshipToWebpage() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "flySpaceship" });
    });
  }

  function sendSpaceshipAwayToAllWebpages() {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { action: "flySpaceshipAway" });
      });
    });
  }

  // ----- Helper for Time Formatting ----- //
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ----- Pomodoro Timer UI & Polling ----- //
  function displayPomodoroTimer() {
    timerContainer.innerHTML = `
      <h2 class="space-title">Pomodoro Timer</h2>
      <p id="timerDisplay" class="space-paragraph">${formatTime(1500)}</p>
      <div>
        <button id="startPomodoroBtn" class="space-button">Start</button>
        <button id="pausePomodoroBtn" class="space-button" style="display: none;">Pause</button>
        <button id="resetPomodoroBtn" class="space-button">Reset</button>
      </div>
    `;
    document.getElementById("startPomodoroBtn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "startPomodoro" }, (response) => {
        if (response.success) {
          updateTimerUI();
        }
      });
    });

    document.getElementById("pausePomodoroBtn").addEventListener("click", () => {
      const btn = document.getElementById("pausePomodoroBtn");
      if (btn.textContent === "Pause") {
        chrome.runtime.sendMessage({ type: "pausePomodoro" }, (response) => {
          if (response.success) {
            updateTimerUI();
          }
        });
      } else {
        chrome.runtime.sendMessage({ type: "resumePomodoro" }, (response) => {
          if (response.success) {
            updateTimerUI();
          }
        });
      }
    });

    document.getElementById("resetPomodoroBtn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "resetPomodoro" }, (response) => {
        if (response.success) {
          updateTimerUI();
        }
      });
    });

    // Poll the timer status every second while the popup is open
    setInterval(updateTimerUI, 1000);
  }

  function updateTimerUI() {
    chrome.runtime.sendMessage({ type: "getPomodoroStatus" }, (response) => {
      if (response.success) {
        document.getElementById("timerDisplay").textContent = formatTime(response.remainingTime);
        if (response.status === "running") {
          document.getElementById("startPomodoroBtn").style.display = "none";
          document.getElementById("pausePomodoroBtn").style.display = "inline-block";
          document.getElementById("pausePomodoroBtn").textContent = "Pause";
        } else if (response.status === "paused") {
          document.getElementById("startPomodoroBtn").style.display = "none";
          document.getElementById("pausePomodoroBtn").style.display = "inline-block";
          document.getElementById("pausePomodoroBtn").textContent = "Resume";
        } else {
          document.getElementById("startPomodoroBtn").style.display = "inline-block";
          document.getElementById("pausePomodoroBtn").style.display = "none";
        }
      }
    });
  }

  // Initialize the Pomodoro timer UI on popup load
  displayPomodoroTimer();
});
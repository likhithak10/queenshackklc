document.addEventListener("DOMContentLoaded", () => {
  const goalContainer = document.getElementById("goalContainer");
  let finalSpaceshipPosition = null;

  // Fetch the current tracking state
  chrome.runtime.sendMessage({ type: "getTrackingState" }, (response) => {
    if (response.isTracking) {
      displayActiveGoal(response.goal);
    } else {
      displayGoalInput();
    }
  });

  // Display the goal input field
  function displayGoalInput() {
    goalContainer.innerHTML = `
      <h1 class="space-title">Space Explorer</h1>
      <p class="space-paragraph">Set your mission goal for this session:</p>
      <input 
        type="text" 
        id="goalInput" 
        class="space-input" 
        placeholder="e.g., Complete my essay..."
      />
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

  // Display the active goal
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
});
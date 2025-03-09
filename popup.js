document.addEventListener("DOMContentLoaded", () => {
  const goalInput = document.getElementById("goalInput");
  const blockingCheckbox = document.getElementById("blockingCheckbox");
  const saveBtn = document.getElementById("saveBtn");
  const statusMsg = document.getElementById("statusMsg");

  const startPomodoroBtn = document.getElementById("startPomodoroBtn");
  const resetPomodoroBtn = document.getElementById("resetPomodoroBtn");
  const pomodoroDisplay = document.getElementById("pomodoroDisplay");

  let pomodoroTimerInterval;
  let remainingTime = 25 * 60; // 25 minutes in seconds
  let isPomodoroRunning = false;

  // Load stored settings
  chrome.storage.sync.get(["userGoal", "blockingEnabled"], (data) => {
    if (data.userGoal) goalInput.value = data.userGoal;
    if (typeof data.blockingEnabled === "boolean") {
      blockingCheckbox.checked = data.blockingEnabled;
    }
  });

  // Save user settings
  saveBtn.addEventListener("click", () => {
    const userGoal = goalInput.value.trim();
    const blockingEnabled = blockingCheckbox.checked;

    chrome.storage.sync.set({ userGoal, blockingEnabled }, () => {
      statusMsg.textContent = "Settings saved!";
      setTimeout(() => {
        statusMsg.textContent = "";
      }, 1500);
    });
  });

  // Pomodoro timer functions
  function startPomodoroTimer() {
    pomodoroTimerInterval = setInterval(() => {
      if (remainingTime > 0) {
        remainingTime--;
        updatePomodoroDisplay();
      } else {
        clearInterval(pomodoroTimerInterval);
        pomodoroDisplay.textContent = "Pomodoro Complete! Time for a break.";
        startPomodoroBtn.textContent = "Start Pomodoro";
        isPomodoroRunning = false;
        resetPomodoroBtn.disabled = true;
        alert("Pomodoro complete! Take a 5-minute break.");
      }
    }, 1000);
  }

  function updatePomodoroDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    pomodoroDisplay.textContent = `Pomodoro Time: ${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  // Button event listeners
  startPomodoroBtn.addEventListener("click", () => {
    if (isPomodoroRunning) {
      clearInterval(pomodoroTimerInterval);
      startPomodoroBtn.textContent = "Start Pomodoro";
      resetPomodoroBtn.disabled = false;
    } else {
      startPomodoroTimer();
      startPomodoroBtn.textContent = "Pause Pomodoro";
      resetPomodoroBtn.disabled = false;
    }
    isPomodoroRunning = !isPomodoroRunning;
  });

  resetPomodoroBtn.addEventListener("click", () => {
    clearInterval(pomodoroTimerInterval);
    remainingTime = 25 * 60;
    updatePomodoroDisplay();
    startPomodoroBtn.textContent = "Start Pomodoro";
    resetPomodoroBtn.disabled = true;
  });

  // Initialize pomodoro display
  updatePomodoroDisplay();
});

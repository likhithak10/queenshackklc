// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const goalInput = document.getElementById("goalInput");
  const blockingCheckbox = document.getElementById("blockingCheckbox");
  const saveBtn = document.getElementById("saveBtn");
  const statusMsg = document.getElementById("statusMsg");

  // Load stored settings
  chrome.storage.sync.get(["userGoal", "blockingEnabled"], (data) => {
    if (data.userGoal) goalInput.value = data.userGoal;
    if (typeof data.blockingEnabled === "boolean") {
      blockingCheckbox.checked = data.blockingEnabled;
    }
  });

  // Save
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
});

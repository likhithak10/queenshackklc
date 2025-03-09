// contentScript.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "OFF_TASK_WARNING") {
      const { url, goal, aiResult } = request.payload;
      showOverlay(`You said your goal is "${goal}", but you're on "${url}".\n Focus Up`);
    }
  });
  
  function showOverlay(message) {
    // Basic overlay
    let overlay = document.getElementById("sotOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "sotOverlay";
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.backgroundColor = "rgba(0,0,0,0.8)";
      overlay.style.color = "#fff";
      overlay.style.zIndex = "999999";
      overlay.style.display = "flex";
      overlay.style.flexDirection = "column";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.textAlign = "center";
      overlay.style.fontSize = "1rem";
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <p style="max-width: 600px; margin: 20px;">
        ${message}
      </p>
      <button id="continueBtn" style="padding: 10px 20px; font-size: 1rem; cursor: pointer;">
        Continue Anyway
      </button>
    `;
    overlay.style.display = "flex";
  
    document.getElementById("continueBtn").addEventListener("click", () => {
      overlay.style.display = "none";
    });
  }
  
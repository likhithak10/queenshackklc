const SPACESHIP_GIF_URL = "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3FjN2ZrZjNwNnp6bzFoMDBxY251aDB2dDZ1MXZiaXluODg0ZXV1bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l4KhQo2MESJkc6QbS/giphy.gif"; // Spaceship GIF
let currentSpaceship = null;

(function addAnimationCSS() {
  if (document.getElementById('animationStyle')) return;
  const styleElem = document.createElement('style');
  styleElem.id = 'animationStyle';
  styleElem.innerHTML = `
    @keyframes float {
      0% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0); }
    }
  `;
  document.head.appendChild(styleElem);
})();

function animateSpaceshipIntoScreen() {
  if (currentSpaceship) {
    currentSpaceship.remove();
    currentSpaceship = null;
  }

  currentSpaceship = document.createElement("img");
  currentSpaceship.src = SPACESHIP_GIF_URL;
  currentSpaceship.style.position = "fixed";
  currentSpaceship.style.top = "0px";
  currentSpaceship.style.right = "-200px";
  currentSpaceship.style.width = "150px";
  currentSpaceship.style.zIndex = "9999";
  currentSpaceship.style.transition = "top 1.5s ease-out, right 1.5s ease-out";

  document.body.appendChild(currentSpaceship);

  setTimeout(() => {
    currentSpaceship.style.top = "40px";
    currentSpaceship.style.right = "20px";

    currentSpaceship.addEventListener('transitionend', () => {
      currentSpaceship.style.animation = "float 2s infinite ease-in-out";
    }, { once: true });
  }, 1200);
}

function animateSpaceshipAway() {
  if (!currentSpaceship) return;

  currentSpaceship.style.animation = "";
  currentSpaceship.style.transition = "right 1.5s ease-in, opacity 1.5s ease-in";
  currentSpaceship.style.right = "-300px";
  currentSpaceship.style.opacity = "0";

  currentSpaceship.addEventListener('transitionend', () => {
    if (currentSpaceship && currentSpaceship.parentElement) {
      currentSpaceship.parentElement.removeChild(currentSpaceship);
      currentSpaceship = null;
    }
  }, { once: true });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "flySpaceship") {
    animateSpaceshipIntoScreen();
    sendResponse({ status: "Spaceship animation triggered" });
  } else if (message.action === "flySpaceshipAway") {
    animateSpaceshipAway();
    sendResponse({ status: "Spaceship fly-away animation triggered" });
  }
});
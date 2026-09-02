const $ = (s) => document.querySelector(s);

let mode = "login";
let user = localStorage.getItem("connectUser");
let activeChat = "Maya";

let posts = JSON.parse(localStorage.getItem("connectPosts") || "[]");
let chats = JSON.parse(localStorage.getItem("connectChats") || "{}");

function render() {
  const authView = $("#authView");
  const homeView = $("#homeView");

  if (user) {
    authView.classList.add("hidden");
    homeView.classList.remove("hidden");
    $("#currentUser").textContent = user;
    $("#profileName").textContent = user;
    $("#profileAvatar").textContent = user.charAt(0).toUpperCase();
    renderPosts();
  } else {
    authView.classList.remove("hidden");
    homeView.classList.add("hidden");

    $("#authMessage").textContent =
      mode === "login"
        ? "Welcome back! Log in to continue."
        : "Create an account to join Connect.";

    $("#authSubmit").textContent =
      mode === "login" ? "Login" : "Create Account";
  }
}

document.querySelectorAll(".tab").forEach((button) => {
  button.onclick = () => {
    mode = button.dataset.mode;

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.remove("active");
    });

    button.classList.add("active");
    render();
  };
});

$("#authForm").onsubmit = async (e) => {
  e.preventDefault();

  const username = $("#username").value.trim();
  const password = $("#password").value;

  if (username.length < 2) {
    $("#authMessage").textContent =
      "Please enter a username with at least 2 characters.";
    return;
  }

  if (password.length < 6) {
    $("#authMessage").textContent =
      "Password must be at least 6 characters.";
    return;
  }

  /*
   * Firebase Authentication uses email/password.
   * We create an internal email address from the username
   * so the existing username-based UI can remain unchanged.
   */
  const firebaseEmail =
    username.toLowerCase().replace(/[^a-z0-9._-]/g, "") +
    "@connect-app.local";

  try {
    $("#authMessage").textContent =
      mode === "signup"
        ? "Creating your account..."
        : "Logging you in...";

    let credential;

    if (mode === "signup") {
      credential = await firebase.auth().createUserWithEmailAndPassword(
        firebaseEmail,
        password
      );
    } else {
      credential = await firebase.auth().signInWithEmailAndPassword(
        firebaseEmail,
        password
      );
    }

    /*
     * Keep your existing app state.
     * The actual password is NO LONGER stored in localStorage.
     */
    user = username;
    localStorage.setItem("connectUser", user);

    $("#authMessage").textContent =
      mode === "signup"
        ? "Account created successfully."
        : "Login successful.";

    $("#authForm").reset();
    render();

  } catch (error) {
    console.error("Firebase authentication error:", error);

    if (error.code === "auth/email-already-in-use") {
      $("#authMessage").textContent =
        "This username already exists. Please log in.";
    } else if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      $("#authMessage").textContent =
        "Incorrect username or password.";
    } else if (error.code === "auth/weak-password") {
      $("#authMessage").textContent =
        "Password must be at least 6 characters.";
    } else if (error.code === "auth/too-many-requests") {
      $("#authMessage").textContent =
        "Too many attempts. Please try again later.";
    } else {
      $("#authMessage").textContent =
        "Authentication failed. Please try again.";
    }
  }
};


$("#logoutBtn").onclick = async () => {
  try {
    await firebase.auth().signOut();

    user = null;
    localStorage.removeItem("connectUser");

    render();
  } catch (error) {
    console.error("Logout error:", error);

    $("#authMessage").textContent =
      "Could not log out. Please try again.";
  }
};

$("#logoutBtn").onclick = () => {
  user = null;
  localStorage.removeItem("connectUser");
  render();
};

document.querySelectorAll(".nav[data-page]").forEach((button) => {
  button.onclick = () => {
    document.querySelectorAll(".nav[data-page]").forEach((nav) => {
      nav.classList.remove("active");
    });

    button.classList.add("active");

    document.querySelectorAll(".page").forEach((page) => {
      page.classList.add("hidden");
    });

    $("#" + button.dataset.page + "Page").classList.remove("hidden");
  };
});

$("#postForm").onsubmit = (e) => {
  e.preventDefault();

  const text = $("#postText").value.trim();

  if (!text) return;

  posts.unshift({
    user: user,
    text: text,
    time: new Date().toLocaleString()
  });

  localStorage.setItem("connectPosts", JSON.stringify(posts));
  $("#postForm").reset();

  renderPosts();
};

function renderPosts() {
  $("#posts").innerHTML = posts.map((post) => `
    <article class="post card">
      <div class="post-head">
        <strong>${escapeHtml(post.user)}</strong>
      </div>
      <p>${escapeHtml(post.text)}</p>
      <small>${escapeHtml(post.time)}</small>
      <div class="post-actions">
        ♡ Like &nbsp; 💬 Comment
      </div>
    </article>
  `).join("");
}

document.querySelectorAll(".contact").forEach((button) => {
  button.onclick = () => {
    activeChat = button.dataset.user;

    document.querySelectorAll(".contact").forEach((contact) => {
      contact.classList.remove("active");
    });

    button.classList.add("active");
    $("#chatName").textContent = activeChat;

    renderMessages();
  };
});

$("#messageForm").onsubmit = (e) => {
  e.preventDefault();

  const text = $("#messageInput").value.trim();

  if (!text) return;

  if (!chats[activeChat]) {
    chats[activeChat] = [];
  }

  chats[activeChat].push({
    sender: user,
    text: text
  });

  localStorage.setItem("connectChats", JSON.stringify(chats));
  $("#messageForm").reset();

  renderMessages();
};

function renderMessages() {
  const messages = chats[activeChat] || [];

  $("#messages").innerHTML = messages.map((message) => `
    <div class="bubble">
      <strong>${escapeHtml(message.sender)}:</strong>
      ${escapeHtml(message.text)}
    </div>
  `).join("");
}

$("#editProfile").onclick = () => {
  const newName = prompt("Enter your new display name:", user);

  if (newName && newName.trim()) {
    user = newName.trim();
    localStorage.setItem("connectUser", user);
    render();
  }
};

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

render();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("Connect Social is ready!"))
      .catch(error => console.log("Service Worker error:", error));
  });
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => console.log("Service Worker registered"))
      .catch((err) => console.error("Service Worker registration failed:", err));
  });
}

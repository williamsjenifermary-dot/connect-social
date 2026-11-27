// Connect Social profile settings
(() => {
  const byId = id => document.getElementById(id);
  const message = (id, value) => { const el = byId(id); if (el) el.textContent = value; };

  document.querySelectorAll("[data-profile-tab]").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.profileTab;
      document.querySelectorAll("[data-profile-tab]").forEach(item => item.classList.toggle("active", item === button));
      document.querySelectorAll("[data-profile-panel]").forEach(panel => panel.classList.toggle("hidden", panel.dataset.profilePanel !== target));
      if (target === "preview") updatePreview();
    });
  });

  const originalRenderProfile = renderProfile;
  renderProfile = function () {
    originalRenderProfile();
    if (!profile) return;
    byId("profileUsername").value = profile.username || "";
    byId("accountEmail").textContent = me && me.email ? me.email : "Phone sign-in account";
    byId("showOnlineToggle").checked = profile.showOnlineStatus !== false;
    byId("bioCount").textContent = (profile.bio || "").length + " / 160";
    updatePreview();
  };

  function updatePreview() {
    if (!profile) return;
    const username = (byId("profileUsername").value || profile.username || "").trim();
    const displayName = (byId("displayName").value || profile.displayName || username).trim();
    const bio = byId("bioInput").value || profile.bio || "";
    byId("previewName").textContent = displayName || username;
    byId("previewUsername").textContent = username ? "@" + username : "";
    byId("previewBio").textContent = bio || "No bio yet.";
    byId("previewAvatar").innerHTML = profile.photoURL
      ? '<img src="' + esc(profile.photoURL) + '" alt="Profile picture">'
      : esc(initials(displayName || username));
  }

  ["profileUsername", "displayName", "bioInput"].forEach(id => {
    byId(id).addEventListener("input", () => {
      if (id === "bioInput") byId("bioCount").textContent = byId(id).value.length + " / 160";
      updatePreview();
    });
  });

  byId("avatarInput").addEventListener("change", () => {
    const file = byId("avatarInput").files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) {
      message("profileSaveMessage", "Choose an image under 3 MB.");
      byId("avatarInput").value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      byId("profileAvatar").innerHTML = '<img src="' + reader.result + '" alt="Profile picture">';
      byId("previewAvatar").innerHTML = '<img src="' + reader.result + '" alt="Profile picture">';
    };
    reader.readAsDataURL(file);
  });

  byId("saveProfile").addEventListener("click", async () => {
    if (!me || !profile) return;
    const button = byId("saveProfile");
    button.disabled = true;
    message("profileSaveMessage", "Saving your profile…");
    try {
      const username = cleanName(byId("profileUsername").value);
      if (username.length < 2) throw new Error("Username must contain at least 2 valid characters.");
      const displayName = byId("displayName").value.trim().slice(0, 40) || username;
      const bio = byId("bioInput").value.trim().slice(0, 160);
      const existing = await db.collection("users").where("usernameLower", "==", username).limit(1).get();
      if (!existing.empty && existing.docs[0].id !== me.uid) throw new Error("That username is already taken. Try another one.");

      let photoURL = profile.photoURL || "";
      const file = byId("avatarInput").files[0];
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "");
        const ref = storage.ref("avatars/" + me.uid + "/" + Date.now() + "-" + safeName);
        await ref.put(file);
        photoURL = await ref.getDownloadURL();
      }

      await db.collection("users").doc(me.uid).set({
        username, usernameLower: username, displayName, bio, photoURL
      }, { merge: true });
      await me.updateProfile({ displayName });
      profile = { ...profile, username, displayName, bio, photoURL };
      byId("avatarInput").value = "";
      renderProfile();
      message("profileSaveMessage", "Your profile has been saved.");
    } catch (error) {
      message("profileSaveMessage", error.message || "Could not save your profile.");
    } finally {
      button.disabled = false;
    }
  });

  byId("resetPasswordBtn").addEventListener("click", async () => {
    if (!me || !me.email) {
      message("accountMessage", "This account uses phone sign-in and has no email address for password reset.");
      return;
    }
    try {
      await auth.sendPasswordResetEmail(me.email);
      message("accountMessage", "Password reset email sent. Check your inbox and spam folder.");
    } catch (error) {
      message("accountMessage", error.message || "Could not send the reset email.");
    }
  });

  byId("savePrivacy").addEventListener("click", async () => {
    if (!me || !profile) return;
    const showOnlineStatus = byId("showOnlineToggle").checked;
    try {
      await db.collection("users").doc(me.uid).set({
        showOnlineStatus,
        online: showOnlineStatus ? true : false
      }, { merge: true });
      profile = { ...profile, showOnlineStatus, online: showOnlineStatus };
      message("privacyMessage", "Privacy setting saved.");
    } catch (error) {
      message("privacyMessage", error.message || "Could not save this setting.");
    }
  });

  // Respect the member's online-status preference when updating presence.
  presence = async function (online) {
    if (!me) return;
    const visible = !profile || profile.showOnlineStatus !== false;
    await db.collection("users").doc(me.uid).set({
      online: !!online && visible,
      lastSeen: serverTime()
    }, { merge: true });
  };
})();

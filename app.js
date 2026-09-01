const $=s=>document.querySelector(s);
let mode="login", user=localStorage.getItem("connectUser"), activeChat="Maya";
let posts=JSON.parse(localStorage.getItem("connectPosts")||"[]");
let chats=JSON.parse(localStorage.getItem("connectChats")||"{}");

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));$("#authSubmit").textContent=mode==="login"?"Login":"Create account";$("#authMessage").textContent=""});
function render(){
 if(user){$("#authView").classList.add("hidden");$("#homeView").classList.remove("hidden");$("#currentUser").textContent=user;$("#profileName").textContent=user;$("#profileAvatar").textContent=user[0].toUpperCase();renderPosts();renderMessages()}
 else{$("#authView").classList.remove("hidden");$("#homeView").classList.add("hidden");$("#currentUser").textContent="Guest"}
}
$("#authForm").onsubmit=e=>{e.preventDefault();const u=$("#username").value.trim();const p=$("#password").value;if(mode==="signup"&&localStorage.getItem("user_"+u)){return $("#authMessage").textContent="Username already exists."}if(mode==="signup")localStorage.setItem("user_"+u,p);else if(localStorage.getItem("user_"+u)!==p){return $("#authMessage").textContent="Invalid username or password."}user=u;localStorage.setItem("connectUser",u);e.target.reset();render()};
$("#logoutBtn").onclick=()=>{user=null;localStorage.removeItem("connectUser");render()};
document.querySelectorAll(".nav[data-page]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav[data-page]").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));$("#"+b.dataset.page+"Page").classList.remove("hidden")});
$("#postForm").onsubmit=e=>{e.preventDefault();posts.unshift({user,text:$("#postText").value.trim(),time:new Date().toLocaleString()});localStorage.setItem("connectPosts",JSON.stringify(posts));$("#postText").value="";renderPosts()};
function renderPosts(){$("#posts").innerHTML=posts.map(p=>`<article class="post card"><div class="post-head"><div class="avatar">${p.user[0].toUpperCase()}</div><div><b>${escapeHtml(p.user)}</b><br><small>${escapeHtml(p.time)}</small></div></div><p>${escapeHtml(p.text)}</p><small>♡ Like &nbsp; · &nbsp; 💬 Comment</small></article>`).join("")||'<div class="card post"><p class="muted">No posts yet. Be the first to share something!</p></div>'}
document.querySelectorAll(".contact").forEach(b=>b.onclick=()=>{document.querySelectorAll(".contact").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeChat=b.dataset.user;$("#chatName").textContent=activeChat;renderMessages()});
$("#messageForm").onsubmit=e=>{e.preventDefault();const text=$("#messageInput").value.trim();if(!text)return;(chats[activeChat]??=[]).push({from:user,text,time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});localStorage.setItem("connectChats",JSON.stringify(chats));$("#messageInput").value="";renderMessages()};
function renderMessages(){const arr=chats[activeChat]||[];$("#messages").innerHTML=arr.map(m=>`<div class="bubble ${m.from===user?"me":""}">${escapeHtml(m.text)}<br><small>${escapeHtml(m.time)}</small></div>`).join("")||'<p class="muted">Start the conversation.</p>';$("#messages").scrollTop=$("#messages").scrollHeight}
$("#editProfile").onclick=()=>{const n=prompt("Enter your display name:",user);if(n&&n.trim()){user=n.trim();localStorage.setItem("connectUser",user);render()}};
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
render();

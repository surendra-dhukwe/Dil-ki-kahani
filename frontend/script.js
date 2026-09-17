const API = "http://localhost:3000";

/* ================= DOM ================= */
const userInput = document.getElementById("user_name");
const titleInput = document.getElementById("title");
const descInput = document.getElementById("description");
const contentInput = document.getElementById("content");

const nameMsg = document.getElementById("nameMsg");
const createBtn = document.getElementById("createBtn");
const suggestions = document.getElementById("suggestions");

const feed = document.getElementById("feed");
const writersBox = document.getElementById("writersBox");
const totalPosts = document.getElementById("totalPosts");

/* ================= STATE ================= */
let users = [];

/* ================= LOAD USERS ================= */
function loadUsers(){
  fetch(API+"/users")
  .then(res=>res.json())
  .then(data=>{
    // ✅ duplicate remove
    users = [...new Set(data.map(u=>u.name))];
  });
}

/* ================= CHECK USER ================= */
function checkUser(){
  let name = userInput.value.trim();

  if(!name){
    nameMsg.innerText="";
    createBtn.style.display="none";
    suggestions.innerHTML="";
    return;
  }

  let filtered = users.filter(u =>
    u.toLowerCase().includes(name.toLowerCase())
  );

  suggestions.innerHTML = filtered.map(n =>
    `<div onclick="selectName('${n}')">${n}</div>`
  ).join("");

  if(users.includes(name)){
    nameMsg.innerText="✅ Welcome " + name;
    nameMsg.style.color="green";
    createBtn.style.display="none";
  }else{
    nameMsg.innerText="⚠️ New user";
    nameMsg.style.color="orange";
    createBtn.style.display="inline-block";
  }
}

/* ================= SELECT NAME ================= */
function selectName(name){
  userInput.value = name;
  suggestions.innerHTML="";
  checkUser();
}

/* ================= CREATE USER ================= */
function createUser(){
  let name = userInput.value.trim();
  if(!name) return showMsg("❌ Enter name");

  fetch(API+"/createUser",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name})
  }).then(()=>{
    loadUsers();
    showMsg("✅ User Created");
  });
}

/* ================= ADD POST ================= */
function addPost(){
  let user = userInput.value.trim();
  let content = contentInput.value.trim();

  if(!user || !content){
    return showMsg("❌ Name aur content required");
  }

  fetch(API+"/addPost",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      user_name:user,
      title:titleInput.value,
      description:descInput.value,
      content:content
    })
  }).then(()=>{
    showMsg("✅ Post Uploaded");

    titleInput.value="";
    descInput.value="";
    contentInput.value="";

    loadPosts();
  });
}

/* ================= TOAST ================= */
function showMsg(text){
  let msg = document.createElement("div");
  msg.className="toast";
  msg.innerText=text;
  document.body.appendChild(msg);

  // ✅ 2.5 sec show
  setTimeout(()=>msg.remove(),2500);
}

/* ================= LOAD POSTS ================= */
function loadPosts(name=""){
  let url = API+"/posts";
  if(name) url += "?name="+encodeURIComponent(name);

  fetch(url)
  .then(res=>res.json())
  .then(data=>{
    totalPosts.innerText = data.length;

    let html="";
    data.forEach(p=>{
      html+=`
      <div class="post"
        ondblclick="heartRain(event)"
        onclick="togglePost(event,this,${p.id})">

        <p>
          <b>Name:</b> 
          <span class="clickable" onclick="filterByName(event,'${p.user_name}')">
            ${p.user_name}
          </span>
        </p>

        <p class="preview">${(p.content || "").substring(0,50)}...</p>

        <div class="details">
          <p><b>Title:</b> ${p.title || "-"}</p>
          <p><b>Description:</b> ${p.description || "-"}</p>
          <p>${p.content}</p>

          <div class="comment-box">
            <input id="c${p.id}" placeholder="Comment..." onclick="event.stopPropagation()">
            <button onclick="addComment(${p.id});event.stopPropagation();">Send</button>
          </div>

          <div id="comments${p.id}"></div>
        </div>
      </div>`;
    });

    feed.innerHTML = html;
  });
}
function filterByName(e,name){
  e.stopPropagation();
  loadPosts(name);
}

// serch posts by name
function searchPosts(){
  let value = document.getElementById("searchInput").value.toLowerCase();

  fetch(API+"/posts")
  .then(res=>res.json())
  .then(data=>{
    let filtered = data.filter(p =>
      p.user_name.toLowerCase().includes(value)
    );

    totalPosts.innerText = filtered.length;

    let html="";
    filtered.forEach(p=>{
      html+=`
      <div class="post" onclick="togglePost(event,this,${p.id})">

        <p>
          <b>Name:</b> 
          <span class="clickable" onclick="filterByName(event,'${p.user_name}')">
            ${p.user_name}
          </span>
        </p>

        <p class="preview">${(p.content || "").substring(0,50)}...</p>

        <div class="details">
          <p>${p.content}</p>
        </div>
      </div>`;
    });

    feed.innerHTML = html;
  });
}

/* ================= TOGGLE POST ================= */
function togglePost(e, el, id){

  if(e.target.tagName==="INPUT" || e.target.tagName==="BUTTON") return;

  // agar already open hai → close kar do
  if(el.classList.contains("active")){
    el.classList.remove("active");
    return;
  }

  // sab close karo
  document.querySelectorAll(".post").forEach(p=>{
    p.classList.remove("active");
  });

  // current open
  el.classList.add("active");
  loadComments(id);
}

/* ================= COMMENTS ================= */
function addComment(id){
  let input = document.getElementById("c"+id);
  let text = input.value.trim();

  if(!text) return;

  fetch(API+"/comment",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      post_id:id,
      user:userInput.value || "guest",
      comment:text
    })
  }).then(()=>{
    input.value="";
    loadComments(id);
  });
}

function loadComments(id){
  fetch(API+"/comments/"+id)
  .then(res=>res.json())
  .then(data=>{
    let html="";
    data.forEach(c=>{
      html+=`<div class="comment"><b>${c.user}</b>: ${c.comment}</div>`;
    });
    document.getElementById("comments"+id).innerHTML=html;
  });
}

/* ================= HEART RAIN ================= */
function heartRain(e){
  for(let i=0;i<50;i++){  // 🔥 more hearts
    let heart=document.createElement("div");

    heart.className="heart";

    // random red / pink
    let colors = ["red","#ff4d6d","#ff85a1","#ff2e63"];
    heart.style.background = colors[Math.floor(Math.random()*colors.length)];

    heart.style.left = (e.clientX + Math.random()*80-40)+"px";
    heart.style.top = e.clientY+"px";

    document.body.appendChild(heart);

    setTimeout(()=>heart.remove(),1200);
  }
}

/* ================= WRITERS ================= */
function loadWriters(){
  writersBox.style.display =
    writersBox.style.display==="block" ? "none" : "block";

  fetch(API+"/writers")
  .then(res=>res.json())
  .then(data=>{
    let html="<h3>Writers</h3>";
    data.forEach(w=>{
      html+=`
      <div onclick="loadPosts('${w.user_name}')">
        ${w.user_name} (${w.total_posts})
      </div>`;
    });
    writersBox.innerHTML=html;
  });
}

/* ================= INIT ================= */
window.onload = ()=>{
  loadUsers();
  loadPosts();
};

function showAll(){
  if(feed.style.display === "none"){
    feed.style.display = "block";
    writersBox.style.display = "none";
  }else{
    feed.style.display = "none";
  }
}
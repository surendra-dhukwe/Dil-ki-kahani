/* =========================================================
   DIL KI BAATE ❤️
   MongoDB Compatible Frontend Script
   ========================================================= */

/* ================= API CONFIG ================= */

// Local development
// Production me agar frontend + backend same server/domain par hain,
// API automatically "" rahega.

const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "";


/* =========================================================
   DOM
   ========================================================= */

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

const createPost = document.querySelector(".create-post");


/* =========================================================
   STATE
   ========================================================= */

let users = [];

let currentView = "posts";

let currentIndex = 0;

let posts = [];

let direction = "right";

let editTimer;

const translateCache = {};


/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */

/* MongoDB _id + old SQL id dono support */

function getPostId(post) {

  if (!post) return "";

  return String(
    post._id ??
    post.id ??
    ""
  );
}


/* Different backend response formats handle */

function getArray(data, key = "") {

  if (Array.isArray(data)) {
    return data;
  }

  if (
    key &&
    data &&
    Array.isArray(data[key])
  ) {
    return data[key];
  }

  return [];
}


/* User name Mongo/SQL dono se */

function getUserName(post) {

  return String(
    post?.user_name ??
    post?.userName ??
    post?.name ??
    "Unknown"
  );
}


/* HTML escaping */

function escapeHtml(value = "") {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* Inline JS ke liye safe string */

function escapeJs(value = "") {

  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}


/* API helper */

async function apiFetch(url, options = {}) {

  const response = await fetch(API + url, options);

  const text = await response.text();

  let data = {};

  try {

    data = text
      ? JSON.parse(text)
      : {};

  } catch {

    data = {
      success: false,
      msg: text || "Invalid server response"
    };

  }

  if (!response.ok) {

    throw new Error(
      data?.msg ||
      data?.message ||
      `HTTP ${response.status}`
    );

  }

  return data;
}


/* =========================================================
   LOAD USERS
   ========================================================= */

async function loadUsers() {

  try {

    const data = await apiFetch("/users");

    const list = getArray(data, "users");

    users = [
      ...new Set(
        list
          .map(u => {

            if (typeof u === "string") {
              return u.trim();
            }

            return String(
              u?.name ??
              u?.user_name ??
              u?.userName ??
              ""
            ).trim();

          })
          .filter(name => name.length > 0)
      )
    ];

  } catch (err) {

    console.error("loadUsers error:", err);

    users = [];

  }

}


/* =========================================================
   CHECK USER
   ========================================================= */

function checkUser() {

  if (!userInput) return;

  const name = userInput.value?.trim() || "";

  if (!name) {

    if (nameMsg) {
      nameMsg.innerText = "";
    }

    if (createBtn) {
      createBtn.style.display = "none";
    }

    if (suggestions) {
      suggestions.innerHTML = "";
    }

    return;
  }


  const lowerName = name.toLowerCase();


  const filtered = users
    .filter(
      u =>
        u &&
        u.toLowerCase().includes(lowerName)
    )
    .slice(0, 5);


  if (suggestions) {

    suggestions.innerHTML =
      filtered
        .map(
          n => `
            <div class="suggest-item">
              ${escapeHtml(n)}
            </div>
          `
        )
        .join("");


    document
      .querySelectorAll(".suggest-item")
      .forEach(el => {

        el.onclick = () => {
          selectName(el.innerText);
        };

      });

  }


  const exists = users.some(
    u =>
      u.toLowerCase() === lowerName
  );


  if (exists) {

    if (nameMsg) {

      nameMsg.innerText =
        "✅ Welcome " + name;

      nameMsg.style.color = "green";

    }

    if (createBtn) {
      createBtn.style.display = "none";
    }

  } else {

    if (nameMsg) {

      nameMsg.innerText =
        "⚠️ New user";

      nameMsg.style.color = "orange";

    }

    if (createBtn) {
      createBtn.style.display = "inline-block";
    }

  }

}


/* =========================================================
   SELECT NAME
   ========================================================= */

function selectName(name) {

  if (!userInput || !name) return;

  userInput.value =
    name.trim();

  if (suggestions) {
    suggestions.innerHTML = "";
  }

  userInput.focus();

  checkUser();

}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser() {

  const name =
    document
      .getElementById("user_name")
      ?.value
      ?.trim();

  const pass =
    document
      .getElementById("password")
      ?.value
      ?.trim();


  if (!name || !pass) {

    return showMsg(
      "❌ Name & Password required"
    );

  }


  try {

    const data = await apiFetch(
      "/login",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          name,
          password: pass
        })
      }
    );


    if (data.success) {

      localStorage.setItem(
        "user_name",
        name
      );


      const uploadBtn =
        document.getElementById(
          "uploadBtn"
        );

      const logoutBtn =
        document.getElementById(
          "logoutBtn"
        );


      if (uploadBtn) {
        uploadBtn.style.display =
          "inline-block";
      }

      if (logoutBtn) {
        logoutBtn.style.display =
          "inline-block";
      }


      showMsg(
        "✅ Login Success"
      );

    } else {

      showMsg(
        data.msg ||
        "❌ Wrong password"
      );

    }

  } catch (err) {

    console.error(
      "login error:",
      err
    );

    showMsg(
      "❌ Server error"
    );

  }

}


/* =========================================================
   CREATE USER
   ========================================================= */

async function createUser() {

  const name =
    userInput?.value
      ?.trim();

  const pass =
    document
      .getElementById("password")
      ?.value
      ?.trim();


  if (!name || !pass) {

    return showMsg(
      "❌ Name & Password required"
    );

  }


  if (createBtn) {
    createBtn.disabled = true;
  }


  try {

    const data =
      await apiFetch(
        "/createUser",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            name,
            password: pass
          })
        }
      );


    if (data.success === false) {

      showMsg(
        data.msg ||
        "⚠️ User already exists"
      );

      return;

    }


    await loadUsers();


    if (nameMsg) {

      nameMsg.innerText =
        "✅ Welcome " + name;

      nameMsg.style.color =
        "green";

    }


    if (createBtn) {
      createBtn.style.display =
        "none";
    }


    localStorage.setItem(
      "user_name",
      name
    );


    /*
      IMPORTANT:
      Password localStorage me save nahi kar rahe.
    */

    const passwordInput =
      document.getElementById(
        "password"
      );

    if (passwordInput) {
      passwordInput.value = "";
    }


    const uploadBtn =
      document.getElementById(
        "uploadBtn"
      );

    const logoutBtn =
      document.getElementById(
        "logoutBtn"
      );


    if (uploadBtn) {
      uploadBtn.style.display =
        "inline-block";
    }

    if (logoutBtn) {
      logoutBtn.style.display =
        "inline-block";
    }


    showMsg(
      "✅ Account Created & Logged In"
    );


  } catch (err) {

    console.error(
      "createUser error:",
      err
    );

    showMsg(
      err.message ||
      "❌ Server error"
    );

  } finally {

    if (createBtn) {
      createBtn.disabled = false;
    }

  }

}


/* =========================================================
   PASSWORD TOGGLE
   ========================================================= */

function togglePass(event) {

  const p =
    document.getElementById(
      "password"
    );

  if (!p) return;


  const hidden =
    p.type === "password";


  p.type =
    hidden
      ? "text"
      : "password";


  const btn =
    event?.currentTarget ||
    event?.target;


  if (btn) {

    btn.innerText =
      hidden
        ? "🙈"
        : "👁";

  }

}


/* =========================================================
   ADD POST
   ========================================================= */

async function addPost(e) {

  const btn =
    e?.currentTarget ||
    e?.target;


  try {

    if (btn) {
      btn.disabled = true;
    }


    const user =
      localStorage.getItem(
        "user_name"
      );


    if (!user) {

      showMsg(
        "❌ Please login first"
      );

      return;

    }


    const hinglish =
      contentInput
        ?.value
        ?.trim() || "";


    const title =
      titleInput
        ?.value
        ?.trim() || "";


    const desc =
      descInput
        ?.value
        ?.trim() || "";


    if (!hinglish) {

      showMsg(
        "❌ Content required"
      );

      return;

    }


    let english =
      hinglish;


    try {

      english =
        await Promise.race([

          translateText(
            hinglish,
            "en"
          ),

          new Promise(
            resolve =>
              setTimeout(
                () =>
                  resolve(
                    hinglish
                  ),
                3000
              )
          )

        ]);

    } catch {

      english =
        hinglish;

    }


    await apiFetch(
      "/addPost",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          user_name:
            user,

          title:
            title,

          description:
            desc,

          content:
            english,

          hinglish:
            hinglish

        })

      }
    );


    showMsg(
      "✅ Post Uploaded"
    );


    if (titleInput) {
      titleInput.value = "";
    }

    if (descInput) {
      descInput.value = "";
    }

    if (contentInput) {
      contentInput.value = "";
    }


    const box =
      document.getElementById(
        "uploadBox"
      );

    if (box) {
      box.style.display =
        "none";
    }


    await loadPosts();


  } catch (err) {

    console.error(
      "addPost error:",
      err
    );

    showMsg(
      err.message ||
      "❌ Failed to upload"
    );


  } finally {

    if (btn) {
      btn.disabled = false;
    }

  }

}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  localStorage.removeItem(
    "user_name"
  );


  const uploadBox =
    document.getElementById(
      "uploadBox"
    );

  const uploadBtn =
    document.getElementById(
      "uploadBtn"
    );

  const logoutBtn =
    document.getElementById(
      "logoutBtn"
    );


  if (uploadBox) {
    uploadBox.style.display =
      "none";
  }

  if (uploadBtn) {
    uploadBtn.style.display =
      "none";
  }

  if (logoutBtn) {
    logoutBtn.style.display =
      "none";
  }


  showMsg(
    "🚪 Logged out"
  );


  loadPosts();

}


/* =========================================================
   TRANSLATION
   ========================================================= */

async function translateText(
  text,
  target
) {

  try {

    if (!text || !target) {
      return text;
    }


    const cleanText =
      text.trim();


    const key =
      cleanText +
      "_" +
      target;


    if (
      Object.prototype.hasOwnProperty.call(
        translateCache,
        key
      )
    ) {

      return translateCache[key];

    }


    const url =
      "https://translate.googleapis.com/" +
      "translate_a/single" +
      "?client=gtx" +
      "&sl=auto" +
      "&tl=" +
      encodeURIComponent(target) +
      "&dt=t" +
      "&q=" +
      encodeURIComponent(cleanText);


    const res =
      await fetch(url);


    if (!res.ok) {
      throw new Error(
        "Translation API error"
      );
    }


    const data =
      await res.json();


    const translated =
      data?.[0]
        ?.map(t => t?.[0])
        .join("")
        .trim();


    if (
      !translated ||
      translated.toLowerCase() ===
        cleanText.toLowerCase()
    ) {

      return cleanText;

    }


    translateCache[key] =
      translated;


    return translated;


  } catch (err) {

    console.error(
      "translate error:",
      err
    );

    return text;

  }

}


/* =========================================================
   SMART TRANSLATE
   ========================================================= */

async function smartTranslate(
  text,
  target
) {

  try {

    if (!text || !target) {
      return text;
    }


    const sentences =
      text.match(
        /[^.!?]+[.!?]?/g
      ) || [];


    const translated =
      await Promise.all(

        sentences.map(
          async sentence => {

            const clean =
              sentence.trim();

            if (!clean) {
              return "";
            }

            return await translateText(
              clean,
              target
            );

          }
        )

      );


    return translated
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();


  } catch (err) {

    console.error(
      "smartTranslate error:",
      err
    );

    return text;

  }

}


/* =========================================================
   LIVE TRANSLATION PREVIEW
   ========================================================= */

if (contentInput) {

  const liveBox =
    document.createElement(
      "div"
    );


  liveBox.id =
    "livePreview";


  liveBox.style.padding =
    "10px";

  liveBox.style.marginTop =
    "8px";

  liveBox.style.display =
    "none";

  liveBox.style.border =
    "1px solid #ddd";

  liveBox.style.borderRadius =
    "8px";

  liveBox.style.background =
    "#fff";


  contentInput.parentNode
    ?.appendChild(
      liveBox
    );


  let typingTimer;


  contentInput.addEventListener(
    "input",
    () => {

      clearTimeout(
        typingTimer
      );


      const text =
        contentInput.value
          .trim();


      if (!text) {

        liveBox.style.display =
          "none";

        return;

      }


      typingTimer =
        setTimeout(
          async () => {

            try {

              const hindi =
                await translateText(
                  text,
                  "hi"
                );


              const english =
                await translateText(
                  text,
                  "en"
                );


              liveBox.innerHTML = `

                <b>Hindi:</b><br>

                <span style="color:green">
                  ${escapeHtml(hindi)}
                </span>

                <br><br>

                <b>English:</b><br>

                <span style="color:#555">
                  ${escapeHtml(english)}
                </span>

              `;


              liveBox.style.display =
                "block";


            } catch {

              liveBox.style.display =
                "none";

            }

          },
          400
        );

    }
  );


  document.addEventListener(
    "click",
    e => {

      if (
        !contentInput.contains(
          e.target
        ) &&
        !liveBox.contains(
          e.target
        )
      ) {

        liveBox.style.display =
          "none";

      }

    }
  );

}


/* =========================================================
   TOAST
   ========================================================= */

function showMsg(text) {

  const old =
    document.querySelector(
      ".toast"
    );

  if (old) {
    old.remove();
  }


  const msg =
    document.createElement(
      "div"
    );


  msg.className =
    "toast";


  msg.innerText =
    text;


  Object.assign(
    msg.style,
    {

      position: "fixed",

      bottom: "20px",

      left: "50%",

      transform:
        "translateX(-50%) translateY(20px)",

      opacity: "0",

      padding:
        "10px 18px",

      background:
        "#111",

      color:
        "#fff",

      borderRadius:
        "8px",

      fontSize:
        "14px",

      zIndex:
        "9999",

      transition:
        "all .3s ease"

    }
  );


  document.body.appendChild(
    msg
  );


  setTimeout(() => {

    msg.style.opacity =
      "1";

    msg.style.transform =
      "translateX(-50%) translateY(0)";

  }, 50);


  setTimeout(() => {

    msg.style.opacity =
      "0";

    msg.style.transform =
      "translateX(-50%) translateY(20px)";

  }, 2000);


  setTimeout(() => {

    msg.remove();

  }, 2500);

}


/* =========================================================
   LOAD POSTS
   ========================================================= */

async function loadPosts(
  name = ""
) {

  try {

    let url =
      "/posts";


    if (name) {

      url +=
        "?name=" +
        encodeURIComponent(
          name
        );

    }


    const data =
      await apiFetch(
        url
      );


    const list =
      getArray(
        data,
        "posts"
      );


    if (totalPosts) {

      totalPosts.innerText =
        list.length;

    }


    if (!feed) {
      return;
    }


    if (!list.length) {

      feed.innerHTML = `

        <p style="
          text-align:center;
          color:#777;
        ">
          No posts yet 😔
        </p>

      `;

      updatePostsList();

      return;

    }


    let html = "";


    list.forEach(post => {

      const id =
        getPostId(post);


      if (!id) {
        return;
      }


      const userRaw =
        getUserName(post);


      const user =
        escapeHtml(
          userRaw
        );


      const userJs =
        escapeJs(
          userRaw
        );


      const contentRaw =
        String(
          post?.content ??
          ""
        );


      const hinglishRaw =
        String(
          post?.hinglish ??
          post?.hinglish_content ??
          ""
        );


      const titleRaw =
        String(
          post?.title ??
          "-"
        );


      const descRaw =
        String(
          post?.description ??
          "-"
        );


      const content =
        escapeHtml(
          contentRaw
        );


      const hinglish =
        escapeHtml(
          hinglishRaw
        );


      const title =
        escapeHtml(
          titleRaw
        );


      const desc =
        escapeHtml(
          descRaw
        );


      const preview =
        escapeHtml(
          contentRaw.substring(
            0,
            60
          )
        );


      html += `

        <!-- COPY BUTTONS -->

        <div class="copy-actions">

          <button
            onclick="copyFullPost(event,'${escapeJs(id)}')"
          >
            📋
          </button>

          <button
            onclick="copyContent(event,'${escapeJs(id)}')"
          >
            📝
          </button>

        </div>


        <!-- POST -->

        <div
          class="post"
          data-post-id="${escapeHtml(id)}"
          ondblclick="heartRain(event)"
          onclick="togglePost(event,this,'${escapeJs(id)}'); popHeart(event)"
        >

          <p>

            <b>Name:</b>

            <span
              class="clickable"
              onclick="filterByName(event,'${userJs}')"
            >
              ${user}
            </span>

          </p>


          <!-- PREVIEW -->

          <p class="preview">

            ${preview}${
              contentRaw.length > 60
                ? "..."
                : ""
            }

          </p>


          <!-- DETAILS -->

          <div class="details">

            <p>
              <b>Title:</b>
              ${title}
            </p>


            <p>
              <b>Description:</b>
              ${desc}
            </p>


            <hr>


            <!-- HINGLISH -->

            <p>

              <b>Hinglish:</b>
              <br>

              <span id="text${escapeHtml(id)}">
                ${hinglish}
              </span>


              <span
                style="
                  float:right;
                  cursor:pointer;
                  color:#007bff;
                "
                onclick="
                  event.stopPropagation();
                  editPost('${escapeJs(id)}')
                "
              >
                ✏️ Edit
              </span>

            </p>


            <!-- ENGLISH -->

            <p
              class="english-content"
              style="color:#555;"
            >

              <b>English:</b>
              <br>

              <span id="eng${escapeHtml(id)}">
                ${content}
              </span>

            </p>


            <!-- EDIT BOX -->

            <div
              id="editBox${escapeHtml(id)}"
              style="
                display:none;
                margin-top:10px;
              "
              onclick="event.stopPropagation()"
            >

              <textarea
                id="editInput${escapeHtml(id)}"
                style="
                  width:100%;
                  height:80px;
                "
                onclick="event.stopPropagation()"
              ></textarea>


              <button
                onclick="
                  event.stopPropagation();
                  saveEdit('${escapeJs(id)}')
                "
              >
                💾 Save
              </button>


              <button
                onclick="
                  event.stopPropagation();
                  cancelEdit('${escapeJs(id)}')
                "
              >
                ❌ Cancel
              </button>


              <div
                id="preview${escapeHtml(id)}"
                style="
                  margin-top:5px;
                  color:green;
                "
              ></div>

            </div>


            <hr>


            <!-- COMMENTS -->

            <div class="comment-box">

              <input
                id="c${escapeHtml(id)}"
                placeholder="Comment..."
                onclick="event.stopPropagation()"
              >


              <button
                onclick="
                  event.stopPropagation();
                  addComment('${escapeJs(id)}')
                "
              >
                Send
              </button>

            </div>


            <div
              id="comments${escapeHtml(id)}"
            ></div>


          </div>

        </div>

      `;

    });


    feed.innerHTML =
      html;


    updatePostsList();


  } catch (err) {

    console.error(
      "loadPosts error:",
      err
    );


    if (feed) {

      feed.innerHTML = `

        <p style="
          text-align:center;
          color:red;
        ">
          Error loading posts 😔
        </p>

      `;

    }

  }

}


/* =========================================================
   FILTER BY NAME
   ========================================================= */

function filterByName(
  e,
  name
) {

  e?.stopPropagation();


  const searchInput =
    document.getElementById(
      "searchInput"
    );


  if (searchInput) {

    searchInput.value =
      name;

  }


  loadPosts(name);

}


/* =========================================================
   COPY FULL POST
   ========================================================= */

function copyFullPost(
  e,
  id
) {

  e?.stopPropagation();


  const post =
    document.querySelector(
      `.post[data-post-id="${CSS.escape(String(id))}"]`
    );


  if (!post) {

    return showMsg(
      "❌ Post not found"
    );

  }


  const text =
    post.innerText;


  navigator.clipboard
    .writeText(text)

    .then(() => {

      showMsg(
        "📋 Full post copied"
      );

    })

    .catch(() => {

      showMsg(
        "❌ Copy failed"
      );

    });

}


/* =========================================================
   COPY CONTENT
   ========================================================= */

function copyContent(
  e,
  id
) {

  e?.stopPropagation();


  const hinglish =
    document.getElementById(
      "text" + id
    )?.innerText ||
    "";


  const english =
    document.getElementById(
      "eng" + id
    )?.innerText ||
    "";


  const finalText =
`Hinglish:
${hinglish}

English:
${english}`;


  navigator.clipboard
    .writeText(finalText)

    .then(() => {

      showMsg(
        "📝 Post copied"
      );

    })

    .catch(() => {

      showMsg(
        "❌ Copy failed"
      );

    });

}


/* =========================================================
   EDIT POST
   ========================================================= */

function editPost(id) {

  const textEl =
    document.getElementById(
      "text" + id
    );


  const box =
    document.getElementById(
      "editBox" + id
    );


  const input =
    document.getElementById(
      "editInput" + id
    );


  if (
    !textEl ||
    !box ||
    !input
  ) {

    return showMsg(
      "❌ Edit error"
    );

  }


  document
    .querySelectorAll(
      "[id^='editBox']"
    )
    .forEach(
      b =>
        b.style.display =
          "none"
    );


  input.value =
    textEl.innerText ||
    "";


  box.style.display =
    "block";


  setTimeout(() => {

    input.focus();

    input.setSelectionRange(
      input.value.length,
      input.value.length
    );

  }, 50);

}


/* =========================================================
   CANCEL EDIT
   ========================================================= */

function cancelEdit(id) {

  const box =
    document.getElementById(
      "editBox" + id
    );


  const preview =
    document.getElementById(
      "preview" + id
    );


  if (box) {

    box.style.display =
      "none";

  }


  if (preview) {

    preview.innerHTML =
      "";

  }

}


/* =========================================================
   EDIT LIVE PREVIEW
   ========================================================= */

document.addEventListener(
  "input",
  e => {

    if (
      !e.target.id ||
      !e.target.id.startsWith(
        "editInput"
      )
    ) {
      return;
    }


    clearTimeout(
      editTimer
    );


    const id =
      e.target.id
        .replace(
          "editInput",
          ""
        )
        .trim();


    const text =
      e.target.value.trim();


    const previewBox =
      document.getElementById(
        "preview" + id
      );


    if (!text) {

      if (previewBox) {
        previewBox.innerHTML =
          "";
      }

      return;

    }


    editTimer =
      setTimeout(
        async () => {

          try {

            const hindi =
              await translateText(
                text,
                "hi"
              );


            if (previewBox) {

              previewBox.innerHTML = `

                <b>Hindi:</b>
                ${escapeHtml(hindi)}

              `;

            }

          } catch {

            if (previewBox) {

              previewBox.innerHTML =
                "";

            }

          }

        },
        400
      );

  }
);


/* =========================================================
   UPLOAD
   ========================================================= */

function showUpload() {

  toggleUpload();

}


function toggleUpload() {

  const box =
    document.getElementById(
      "uploadBox"
    );


  if (!box) return;


  if (
    box.style.display ===
      "none" ||
    box.style.display ===
      ""
  ) {

    box.style.display =
      "block";

  } else {

    box.style.display =
      "none";

  }

}


/* =========================================================
   SAVE EDIT
   ========================================================= */

async function saveEdit(id) {

  const input =
    document.getElementById(
      "editInput" + id
    );


  const hinglish =
    input?.value
      ?.trim() || "";


  if (!hinglish) {

    return showMsg(
      "❌ Empty text"
    );

  }


  const password =
    prompt(
      "Enter your password to edit:"
    );


  if (!password) {

    return showMsg(
      "❌ Password required"
    );

  }


  try {

    const english =
      await translateText(
        hinglish,
        "en"
      );


    const data =
      await apiFetch(
        "/editPost",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            id:
              String(id),

            password:
              password,

            content:
              english,

            hinglish:
              hinglish

          })

        }
      );


    if (!data.success) {

      return showMsg(
        data.msg ||
        "❌ Update failed"
      );

    }


    const textEl =
      document.getElementById(
        "text" + id
      );


    if (textEl) {

      textEl.innerText =
        hinglish;

    }


    const englishEl =
      document.getElementById(
        "eng" + id
      );


    if (englishEl) {

      englishEl.innerText =
        english;

    }


    cancelEdit(id);


    showMsg(
      "✅ Updated Successfully"
    );


  } catch (err) {

    console.error(
      "saveEdit error:",
      err
    );

    showMsg(
      err.message ||
      "❌ Update error"
    );

  }

}


/* =========================================================
   SEARCH POSTS
   ========================================================= */

async function searchPosts() {

  const input =
    document.getElementById(
      "searchInput"
    );


  if (!input) return;


  const value =
    input.value
      .trim()
      .toLowerCase();


  if (!value) {

    await loadPosts();

    return;

  }


  try {

    const data =
      await apiFetch(
        "/posts"
      );


    const allPosts =
      getArray(
        data,
        "posts"
      );


    const filtered =
      allPosts.filter(
        p => {

          const user =
            getUserName(
              p
            ).toLowerCase();


          const title =
            String(
              p?.title || ""
            ).toLowerCase();


          const content =
            String(
              p?.content || ""
            ).toLowerCase();


          const hinglish =
            String(
              p?.hinglish || ""
            ).toLowerCase();


          return (
            user.includes(value) ||
            title.includes(value) ||
            content.includes(value) ||
            hinglish.includes(value)
          );

        }
      );


    if (totalPosts) {

      totalPosts.innerText =
        filtered.length;

    }


    if (!filtered.length) {

      feed.innerHTML = `

        <p style="
          text-align:center;
          color:#777;
        ">
          No result found 😔
        </p>

      `;

      updatePostsList();

      return;

    }


    /*
      Search result ke liye same
      full renderer use karna easiest hai.
      Temporary data ko feed me render karne
      ke liye helper use kar rahe hain.
    */

    renderPostList(
      filtered
    );


  } catch (err) {

    console.error(
      "search error:",
      err
    );


    feed.innerHTML = `

      <p style="
        text-align:center;
        color:red;
      ">
        Search error 😔
      </p>

    `;

  }

}


/* =========================================================
   RENDER POST LIST
   ========================================================= */

function renderPostList(
  list
) {

  if (!feed) return;


  let html = "";


  list.forEach(post => {

    const id =
      getPostId(post);


    if (!id) return;


    const userRaw =
      getUserName(post);


    const contentRaw =
      String(
        post?.content ??
        ""
      );


    const hinglishRaw =
      String(
        post?.hinglish ??
        ""
      );


    const titleRaw =
      String(
        post?.title ??
        "-"
      );


    const descRaw =
      String(
        post?.description ??
        "-"
      );


    html += `

      <div class="copy-actions">

        <button
          onclick="copyFullPost(event,'${escapeJs(id)}')"
        >
          📋
        </button>

        <button
          onclick="copyContent(event,'${escapeJs(id)}')"
        >
          📝
        </button>

      </div>


      <div
        class="post"
        data-post-id="${escapeHtml(id)}"
        ondblclick="heartRain(event)"
        onclick="togglePost(event,this,'${escapeJs(id)}'); popHeart(event)"
      >

        <p>

          <b>Name:</b>

          <span
            class="clickable"
            onclick="filterByName(event,'${escapeJs(userRaw)}')"
          >
            ${escapeHtml(userRaw)}
          </span>

        </p>


        <p class="preview">

          ${escapeHtml(
            contentRaw.substring(
              0,
              60
            )
          )}

          ${
            contentRaw.length > 60
              ? "..."
              : ""
          }

        </p>


        <div class="details">

          <p>
            <b>Title:</b>
            ${escapeHtml(titleRaw)}
          </p>

          <p>
            <b>Description:</b>
            ${escapeHtml(descRaw)}
          </p>


          <hr>


          <p>

            <b>Hinglish:</b>
            <br>

            <span id="text${escapeHtml(id)}">
              ${escapeHtml(hinglishRaw)}
            </span>

          </p>


          <p
            style="color:#555;"
            class="english-content"
          >

            <b>English:</b>
            <br>

            <span id="eng${escapeHtml(id)}">
              ${escapeHtml(contentRaw)}
            </span>

          </p>


        </div>

      </div>

    `;

  });


  feed.innerHTML =
    html;


  updatePostsList();

}


/* =========================================================
   TAGLINE
   ========================================================= */

async function changeTagline() {

  const tag =
    document.querySelector(
      ".tagline"
    );


  if (!tag) return;


  try {

    const data =
      await apiFetch(
        "/posts"
      );


    const list =
      getArray(
        data,
        "posts"
      );


    if (!list.length) {

      tag.innerText =
`हर कोई गलत नहीं होता,
बस उसे देखने का नजरिया अलग होता है…`;

      return;

    }


    const lastIndex =
      localStorage.getItem(
        "last_tag_index"
      );


    let newIndex;


    do {

      newIndex =
        Math.floor(
          Math.random() *
          list.length
        );

    } while (
      list.length > 1 &&
      String(newIndex) ===
        String(lastIndex)
    );


    localStorage.setItem(
      "last_tag_index",
      newIndex
    );


    const random =
      list[newIndex];


    const text =
      String(
        random?.hinglish ||
        random?.content ||
        ""
      );


    const name =
      getUserName(
        random
      );


    tag.innerHTML = `

      "${escapeHtml(text)}"

      <br>

      <small
        style="color:#aaa"
      >
        — ${escapeHtml(name)}
      </small>

    `;


  } catch {

    tag.innerText =
      "Error loading 😔";

  }

}


function changeTaglineManually() {

  localStorage.removeItem(
    "tagline_text"
  );

  localStorage.removeItem(
    "tagline_date"
  );

  changeTagline();

}


/* =========================================================
   TOGGLE POST
   ========================================================= */

function togglePost(
  e,
  el,
  id
) {

  e?.stopPropagation();


  if (!el) return;


  if (
    el.classList.contains(
      "active"
    )
  ) {

    return;

  }


  document
    .querySelectorAll(
      ".post.active"
    )
    .forEach(
      p =>
        p.classList.remove(
          "active"
        )
    );


  el.classList.add(
    "active"
  );


  const commentsBox =
    document.getElementById(
      "comments" + id
    );


  if (
    commentsBox &&
    !commentsBox.dataset.loaded
  ) {

    commentsBox.dataset.loaded =
      "true";

    loadComments(id);

  }


  setTimeout(() => {

    const y =
      el.offsetTop - 100;


    window.scrollTo({
      top: y,
      behavior: "smooth"
    });

  }, 100);

}


/* =========================================================
   FILTER / OUTSIDE CLICK
   ========================================================= */

document.addEventListener(
  "click",
  e => {

    const active =
      document.querySelector(
        ".post.active"
      );


    if (
      !active ||
      e.target.closest(
        ".post"
      )
    ) {
      return;
    }


    active.classList.remove(
      "active"
    );

  }
);


/* =========================================================
   COMMENTS
   ========================================================= */

async function addComment(id) {

  const input =
    document.getElementById(
      "c" + id
    );


  if (!input) return;


  const text =
    input.value.trim();


  const user =
    userInput?.value?.trim() ||
    localStorage.getItem(
      "user_name"
    ) ||
    "guest";


  if (!text) {

    return showMsg(
      "❌ Comment empty hai"
    );

  }


  try {

    await apiFetch(
      "/comment",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          /*
            MongoDB _id string
          */

          post_id:
            String(id),

          user:
            user,

          comment:
            text

        })

      }
    );


    input.value = "";


    await loadComments(
      id
    );


    const box =
      document.getElementById(
        "comments" + id
      );


    if (box) {

      box.dataset.loaded =
        "true";

    }


    showMsg(
      "💬 Comment added"
    );


  } catch (err) {

    console.error(
      "comment error:",
      err
    );

    showMsg(
      err.message ||
      "❌ Comment failed"
    );

  }

}


/* =========================================================
   LOAD COMMENTS
   ========================================================= */

async function loadComments(
  id
) {

  try {

    const data =
      await apiFetch(
        "/comments/" +
        encodeURIComponent(
          String(id)
        )
      );


    const comments =
      getArray(
        data,
        "comments"
      );


    const box =
      document.getElementById(
        "comments" + id
      );


    if (!box) return;


    if (!comments.length) {

      box.innerHTML = `

        <div
          class="comment"
          style="color:gray;"
        >
          No comments yet 😔
        </div>

      `;

      return;

    }


    box.innerHTML =
      comments
        .map(c => {

          const user =
            c?.user ??
            c?.name ??
            "Anonymous";


          const comment =
            c?.comment ??
            "";


          return `

            <div class="comment">

              <b>
                ${escapeHtml(user)}
              </b>:

              ${escapeHtml(comment)}

            </div>

          `;

        })
        .join("");


  } catch (err) {

    console.error(
      "loadComments error:",
      err
    );


    const box =
      document.getElementById(
        "comments" + id
      );


    if (box) {

      box.innerHTML = `

        <div
          class="comment"
          style="color:red;"
        >
          Error loading comments ❌
        </div>

      `;

    }

  }

}


/* =========================================================
   WRITERS
   ========================================================= */

async function loadWriters() {

  if (!writersBox) return;


  if (
    currentView ===
    "writers"
  ) {

    showAll();

    return;

  }


  currentView =
    "writers";


  writersBox.classList.remove(
    "hide"
  );


  feed?.classList.add(
    "hide"
  );


  createPost?.classList.add(
    "hide"
  );


  try {

    const data =
      await apiFetch(
        "/writers"
      );


    const writers =
      getArray(
        data,
        "writers"
      );


    if (!writers.length) {

      writersBox.innerHTML = `

        <h3>Writers</h3>

        <p>
          No writers found 😔
        </p>

      `;

      return;

    }


    let html =
      "<h3>Writers</h3>";


    writers.forEach(
      writer => {

        const name =
          String(
            writer?.user_name ??
            writer?.userName ??
            writer?.name ??
            "Unknown"
          );


        const count =
          Number(
            writer?.total_posts ??
            writer?.totalPosts ??
            writer?.count ??
            0
          );


        html += `

          <div
            onclick="
              loadPosts('${escapeJs(name)}')
            "
            style="cursor:pointer;"
          >

            ${escapeHtml(name)}
            (${count})

          </div>

        `;

      }
    );


    writersBox.innerHTML =
      html;


  } catch (err) {

    console.error(
      "writers error:",
      err
    );


    writersBox.innerHTML = `

      <h3>Writers</h3>

      <p style="color:red;">
        Error loading writers ❌
      </p>

    `;

  }

}


/* =========================================================
   SHOW ALL POSTS
   ========================================================= */

function showAll() {

  currentView =
    "posts";


  feed?.classList.remove(
    "hide"
  );


  writersBox?.classList.add(
    "hide"
  );


  createPost?.classList.add(
    "hide"
  );


  loadPosts();

}


/* =========================================================
   UPLOAD VIEW
   ========================================================= */

function toggleUpload() {

  if (!createPost) {

    const box =
      document.getElementById(
        "uploadBox"
      );


    if (box) {

      box.style.display =
        box.style.display ===
          "none"
          ? "block"
          : "none";

    }

    return;

  }


  if (
    createPost.classList.contains(
      "hide"
    )
  ) {

    createPost.classList.remove(
      "hide"
    );

    currentView =
      "upload";

  } else {

    createPost.classList.add(
      "hide"
    );

    currentView =
      "posts";

  }


  feed?.classList.remove(
    "hide"
  );


  writersBox?.classList.add(
    "hide"
  );

}


/* =========================================================
   POST VIEWER / NAVIGATION
   ========================================================= */

function updatePostsList() {

  posts =
    [
      ...document.querySelectorAll(
        ".post"
      )
    ];

}


function openPost(
  post
) {

  if (!post) return;


  updatePostsList();


  currentIndex =
    posts.indexOf(
      post
    );


  posts.forEach(
    p =>
      p.classList.remove(
        "active"
      )
  );


  post.classList.add(
    "active"
  );


  document.body.classList.add(
    "post-open"
  );


  addNavButtons();

}


/* =========================================================
   CLOSE POST
   ========================================================= */

function closePost() {

  document.body.classList.remove(
    "post-open"
  );


  document
    .querySelectorAll(
      ".post.active"
    )
    .forEach(
      p =>
        p.classList.remove(
          "active"
        )
    );


  document
    .querySelectorAll(
      ".post-nav, .post-close"
    )
    .forEach(
      el =>
        el.remove()
    );

}


/* =========================================================
   VIEWER COMPATIBILITY
   ========================================================= */

function openViewer() {

  updatePostsList();


  if (
    !posts.length
  ) {
    return;
  }


  openPost(
    posts[currentIndex]
  );

}


function closeViewer() {

  closePost();

}


/* =========================================================
   NEXT POST
   ========================================================= */

function nextPost() {

  updatePostsList();


  if (!posts.length) {
    return;
  }


  direction =
    "right";


  currentIndex++;


  if (
    currentIndex >=
    posts.length
  ) {

    currentIndex = 0;

  }


  switchPost();

}


/* =========================================================
   PREVIOUS POST
   ========================================================= */

function prevPost() {

  updatePostsList();


  if (!posts.length) {
    return;
  }


  direction =
    "left";


  currentIndex--;


  if (
    currentIndex < 0
  ) {

    currentIndex =
      posts.length - 1;

  }


  switchPost();

}


/* =========================================================
   SWITCH POST
   ========================================================= */

function switchPost() {

  updatePostsList();


  if (!posts.length) {
    return;
  }


  posts.forEach(
    p => {

      p.classList.remove(
        "active",
        "slide-in-left",
        "slide-in-right"
      );

    }
  );


  const newPost =
    posts[currentIndex];


  if (!newPost) {
    return;
  }


  newPost.classList.add(
    "active"
  );


  if (
    direction ===
    "right"
  ) {

    newPost.classList.add(
      "slide-in-right"
    );

  } else {

    newPost.classList.add(
      "slide-in-left"
    );

  }


  addNavButtons();


  const id =
    newPost.dataset.postId;


  if (id) {

    const commentsBox =
      document.getElementById(
        "comments" + id
      );


    if (
      commentsBox &&
      !commentsBox.dataset.loaded
    ) {

      commentsBox.dataset.loaded =
        "true";

      loadComments(id);

    }

  }


  setTimeout(() => {

    newPost.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

  }, 100);

}


/* =========================================================
   NAVIGATION BUTTONS
   ========================================================= */

function addNavButtons() {

  document
    .querySelectorAll(
      ".post-nav, .post-close"
    )
    .forEach(
      el =>
        el.remove()
    );


  const prev =
    document.createElement(
      "button"
    );


  prev.innerText =
    "⬅";


  prev.className =
    "post-nav post-prev";


  prev.onclick =
    e => {

      e.stopPropagation();

      prevPost();

    };


  const next =
    document.createElement(
      "button"
    );


  next.innerText =
    "➡";


  next.className =
    "post-nav post-next";


  next.onclick =
    e => {

      e.stopPropagation();

      nextPost();

    };


  const close =
    document.createElement(
      "button"
    );


  close.innerText =
    "✖";


  close.className =
    "post-close";


  close.onclick =
    e => {

      e.stopPropagation();

      closePost();

    };


  document.body.append(
    prev,
    next,
    close
  );

}


/* =========================================================
   KEYBOARD NAVIGATION
   ========================================================= */

document.addEventListener(
  "keydown",
  e => {

    if (
      !document.body.classList.contains(
        "post-open"
      )
    ) {
      return;
    }


    if (
      e.key ===
      "ArrowRight"
    ) {

      nextPost();

    }


    if (
      e.key ===
      "ArrowLeft"
    ) {

      prevPost();

    }


    if (
      e.key ===
      "Escape"
    ) {

      closePost();

    }

  }
);


/* =========================================================
   MOBILE SWIPE
   ========================================================= */

let startX = 0;


document.addEventListener(
  "touchstart",
  e => {

    startX =
      e.touches[0]
        ?.clientX ||
      0;

  },
  {
    passive: true
  }
);


document.addEventListener(
  "touchend",
  e => {

    if (
      !document.body.classList.contains(
        "post-open"
      )
    ) {
      return;
    }


    const endX =
      e.changedTouches[0]
        ?.clientX ||
      0;


    const diff =
      startX -
      endX;


    if (
      Math.abs(diff) <
      50
    ) {
      return;
    }


    if (
      diff > 0
    ) {

      nextPost();

    } else {

      prevPost();

    }

  },
  {
    passive: true
  }
);


/* =========================================================
   CLEAR SEARCH
   ========================================================= */

function clearSearch() {

  const input =
    document.getElementById(
      "searchInput"
    );


  if (input) {
    input.value = "";
  }


  loadPosts();

}


/* =========================================================
   HEART RAIN
   ========================================================= */

function heartRain(e) {

  const colors = [
    "red",
    "#ff4d6d",
    "#ff85a1",
    "#ff2e63"
  ];


  for (
    let i = 0;
    i < 50;
    i++
  ) {

    const heart =
      document.createElement(
        "div"
      );


    heart.className =
      "heart";


    heart.style.background =
      colors[
        Math.floor(
          Math.random() *
          colors.length
        )
      ];


    heart.style.left =
      (
        e.clientX +
        Math.random() * 80 -
        40
      ) + "px";


    heart.style.top =
      e.clientY + "px";


    document.body.appendChild(
      heart
    );


    setTimeout(
      () =>
        heart.remove(),
      1200
    );

  }

}


/* =========================================================
   POP HEART
   ========================================================= */

function popHeart(e) {

  if (!e) return;


  const heart =
    document.createElement(
      "div"
    );


  heart.innerText =
    "❤️";


  heart.className =
    "like-pop";


  heart.style.left =
    e.clientX + "px";


  heart.style.top =
    e.clientY + "px";


  document.body.appendChild(
    heart
  );


  setTimeout(
    () =>
      heart.remove(),
    800
  );

}


/* =========================================================
   FLOATING HEART BACKGROUND
   ========================================================= */

setInterval(() => {

  const heart =
    document.createElement(
      "div"
    );


  heart.className =
    "heart-bg";


  heart.style.left =
    Math.random() *
      100 +
    "vw";


  heart.style.animationDuration =
    3 +
    Math.random() * 3 +
    "s";


  document.body.appendChild(
    heart
  );


  setTimeout(
    () =>
      heart.remove(),
    6000
  );

}, 500);


/* =========================================================
   LOVE STORM
   ========================================================= */

function startLoveStorm() {

  let heartInterval =
    setInterval(() => {

      for (
        let i = 0;
        i < 5;
        i++
      ) {

        const h =
          document.createElement(
            "div"
          );


        h.className =
          "heart";


        h.style.left =
          Math.random() *
            100 +
          "vw";


        document.body.appendChild(
          h
        );


        setTimeout(
          () =>
            h.remove(),
          4000
        );

      }

    }, 300);


  setTimeout(() => {

    clearInterval(
      heartInterval
    );


    const rainInterval =
      setInterval(() => {

        for (
          let i = 0;
          i < 20;
          i++
        ) {

          const r =
            document.createElement(
              "div"
            );


          r.className =
            "rain-drop";


          r.style.left =
            Math.random() *
              100 +
            "vw";


          document.body.appendChild(
            r
          );


          setTimeout(
            () =>
              r.remove(),
            1000
          );

        }

      }, 100);


    const lightningInterval =
      setInterval(() => {

        const flash =
          document.createElement(
            "div"
          );


        flash.className =
          "lightning";


        document.body.appendChild(
          flash
        );


        setTimeout(
          () =>
            flash.remove(),
          300
        );

      }, 2000);


    setTimeout(() => {

      clearInterval(
        rainInterval
      );

      clearInterval(
        lightningInterval
      );


      const flowerInterval =
        setInterval(() => {

          const flower =
            document.createElement(
              "div"
            );


          flower.className =
            "flower";


          flower.innerText =
            "🌸";


          flower.style.left =
            Math.random() *
              100 +
            "vw";


          document.body.appendChild(
            flower
          );


          setTimeout(
            () =>
              flower.remove(),
            5000
          );

        }, 300);


      setTimeout(() => {

        clearInterval(
          flowerInterval
        );


        startLoveStorm();

      }, 5000);


    }, 4000);


  }, 3000);

}


/* =========================================================
   EFFECT ENGINE
   ========================================================= */

let currentEffect =
  "flower";


const layer =
  document.createElement(
    "div"
  );


layer.className =
  "effect-layer";


document.body.appendChild(
  layer
);


/* =========================================================
   CREATE EFFECT ITEM
   ========================================================= */

function createItem(
  type
) {

  const el =
    document.createElement(
      "div"
    );


  el.className =
    "effect-item";


  if (
    type ===
    "flower"
  ) {

    el.innerText =
      "🌸";

  }


  if (
    type ===
    "heart"
  ) {

    el.innerText =
      "❤️";

  }


  if (
    type ===
    "rain"
  ) {

    el.innerText =
      "💧";

  }


  el.style.left =
    Math.random() *
      100 +
    "vw";


  el.style.top =
    "-20px";


  layer.appendChild(
    el
  );


  const fall =
    setInterval(() => {

      const top =
        el.offsetTop;


      el.style.top =
        top + 3 + "px";


      if (
        top >
        window.innerHeight
      ) {

        clearInterval(
          fall
        );

        el.remove();

      }

    }, 16);

}


/* =========================================================
   START EFFECTS
   ========================================================= */

function startEffects() {

  setInterval(() => {

    if (
      currentEffect ===
      "flower"
    ) {

      currentEffect =
        "heart";

    } else if (
      currentEffect ===
      "heart"
    ) {

      currentEffect =
        "rain";

    } else if (
      currentEffect ===
      "rain"
    ) {

      currentEffect =
        "lightning";


      const flash =
        document.createElement(
          "div"
        );


      flash.className =
        "flash-bg";


      document.body.appendChild(
        flash
      );


      setTimeout(
        () =>
          flash.remove(),
        300
      );

    } else {

      currentEffect =
        "flower";

    }

  }, 4000);


  setInterval(() => {

    for (
      let i = 0;
      i < 5;
      i++
    ) {

      if (
        currentEffect !==
        "lightning"
      ) {

        createItem(
          currentEffect
        );

      }

    }

  }, 200);

}


/* =========================================================
   SCROLL COLLECT
   ========================================================= */

window.addEventListener(
  "scroll",
  () => {

    document
      .querySelectorAll(
        ".effect-item"
      )
      .forEach(
        el =>
          el.classList.add(
            "collect"
          )
      );

  }
);


/* =========================================================
   CLICK SPREAD
   ========================================================= */

document.addEventListener(
  "click",
  e => {

    document
      .querySelectorAll(
        ".effect-item"
      )
      .forEach(el => {

        const x =
          e.clientX;


        const y =
          e.clientY;


        el.style.transform =
          `translate(
            ${x - el.offsetLeft}px,
            ${y - el.offsetTop}px
          ) scale(1.2)`;

      });

  }
);


/* =========================================================
   DOUBLE CLICK BLAST
   ========================================================= */

document.addEventListener(
  "dblclick",
  () => {

    document
      .querySelectorAll(
        ".effect-item"
      )
      .forEach(el => {

        const x =
          (
            Math.random() -
            0.5
          ) * 600;


        const y =
          (
            Math.random() -
            0.5
          ) * 600;


        el.style.transform =
          `translate(
            ${x}px,
            ${y}px
          ) scale(2)`;


        el.style.opacity =
          "0";

      });

  }
);


/* =========================================================
   RIPPLE
   ========================================================= */

document.addEventListener(
  "click",
  e => {

    if (
      e.target.closest(
        ".post"
      )
    ) {
      return;
    }


    const ripple =
      document.createElement(
        "div"
      );


    ripple.className =
      "ripple";


    ripple.style.left =
      e.clientX + "px";


    ripple.style.top =
      e.clientY + "px";


    ripple.style.width =
      "20px";


    ripple.style.height =
      "20px";


    document.body.appendChild(
      ripple
    );


    setTimeout(
      () =>
        ripple.remove(),
      600
    );

  }
);


/* =========================================================
   TYPEWRITER
   ========================================================= */

setTimeout(() => {

  document
    .querySelectorAll(
      ".post .details p"
    )
    .forEach(
      p =>
        p.classList.add(
          "type-text"
        )
    );

}, 500);


/* =========================================================
   INITIALIZATION
   ========================================================= */

window.addEventListener(
  "load",
  async () => {

    const uploadBtn =
      document.getElementById(
        "uploadBtn"
      );


    const logoutBtn =
      document.getElementById(
        "logoutBtn"
      );


    const uploadBox =
      document.getElementById(
        "uploadBox"
      );


    const user =
      localStorage.getItem(
        "user_name"
      );


    /* ================= UI ================= */

    if (uploadBox) {

      uploadBox.style.display =
        "none";

    }


    if (user) {

      if (uploadBtn) {

        uploadBtn.style.display =
          "inline-block";

      }


      if (logoutBtn) {

        logoutBtn.style.display =
          "inline-block";

      }

    } else {

      if (uploadBtn) {

        uploadBtn.style.display =
          "none";

      }


      if (logoutBtn) {

        logoutBtn.style.display =
          "none";

      }

    }


    /* ================= DATA ================= */

    await Promise.allSettled([
      loadPosts(),
      loadUsers()
    ]);


    /* ================= INPUT ================= */

    const passInput =
      document.getElementById(
        "password"
      );


    if (userInput) {

      userInput.value =
        user || "";

    }


    if (passInput) {

      passInput.value =
        "";

    }


    /* ================= UPLOAD ================= */

    if (uploadBtn) {

      uploadBtn.onclick =
        () => {

          toggleUpload();

        };

    }


    /* ================= LOGOUT ================= */

    if (logoutBtn) {

      logoutBtn.onclick =
        () => {

          logout();

        };

    }


    /* ================= USER INPUT ================= */

    if (userInput) {

      userInput.addEventListener(
        "input",
        checkUser
      );

    }


    /* ================= EFFECTS ================= */

    try {

      startLoveStorm();

    } catch (e) {

      console.error(
        "Love storm error:",
        e
      );

    }


    try {

      startEffects();

    } catch (e) {

      console.error(
        "Effects error:",
        e
      );

    }


    try {

      changeTagline();

    } catch (e) {

      console.error(
        "Tagline error:",
        e
      );

    }

  }
);


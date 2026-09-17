require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();

/* =====================================================
   APP CONFIG
===================================================== */

app.use(cors());
app.use(express.json({ limit: "2mb" }));

/* =====================================================
   FRONTEND
===================================================== */

app.use(express.static(path.join(__dirname, "public")));

/* =====================================================
   MONGODB CONNECTION
===================================================== */

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("======================================");
      console.log("✅ MongoDB Connected Successfully");
      console.log("======================================");
    })
    .catch((err) => {
      console.error("❌ MongoDB Connection Failed:");
      console.error(err.message);
    });
}

/* =====================================================
   USER SCHEMA
===================================================== */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

/* =====================================================
   POST SCHEMA
===================================================== */

const postSchema = new mongoose.Schema(
  {
    user_name: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    content: {
      type: String,
      default: "",
    },

    hindi: {
      type: String,
      default: "",
    },

    hinglish: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model("Post", postSchema);

/* =====================================================
   COMMENT SCHEMA
===================================================== */

const commentSchema = new mongoose.Schema(
  {
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Post",
    },

    user: {
      type: String,
      default: "guest",
      trim: true,
    },

    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Comment = mongoose.model("Comment", commentSchema);

/* =====================================================
   ESCAPE REGEX
===================================================== */

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* =====================================================
   DATABASE STATUS
===================================================== */

app.get("/api/status", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.json({
    server: "Dil Ki Baate",
    database: connected
      ? "MongoDB connected"
      : "MongoDB disconnected",
    status: connected ? "online" : "offline",
  });
});

/* =====================================================
   USERS
===================================================== */

app.get("/users", async (req, res) => {
  try {
    const users = await User.find({})
      .select("name")
      .sort({ name: 1 })
      .lean();

    res.json(users);
  } catch (err) {
    console.error("❌ GET /users:", err.message);

    res.status(500).json([]);
  }
});

/* =====================================================
   CREATE USER
===================================================== */

app.post("/createUser", async (req, res) => {
  try {
    let { name, password } = req.body;

    name = String(name || "").trim();
    password = String(password || "").trim();

    if (!name || !password) {
      return res.status(400).json({
        success: false,
        msg: "Name & Password required",
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 4 characters",
      });
    }

    const existingUser = await User.findOne({
      name: {
        $regex: `^${escapeRegex(name)}$`,
        $options: "i",
      },
    });

    if (existingUser) {
      return res.json({
        success: false,
        msg: "User already exists",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      password: hash,
    });

    console.log(`✅ New user created: ${user.name}`);

    res.json({
      success: true,
      msg: "Account created successfully",

      user: {
        id: user._id.toString(),
        name: user.name,
      },
    });
  } catch (err) {
    console.error("❌ CREATE USER ERROR:", err);

    if (err.code === 11000) {
      return res.json({
        success: false,
        msg: "User already exists",
      });
    }

    res.status(500).json({
      success: false,
      msg: "Error creating user",
    });
  }
});

/* =====================================================
   LOGIN
===================================================== */

app.post("/login", async (req, res) => {
  try {
    let { name, password } = req.body;

    name = String(name || "").trim();
    password = String(password || "").trim();

    if (!name || !password) {
      return res.json({
        success: false,
        msg: "Name & Password required",
      });
    }

    const user = await User.findOne({
      name: {
        $regex: `^${escapeRegex(name)}$`,
        $options: "i",
      },
    });

    if (!user) {
      return res.json({
        success: false,
        msg: "User not found",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.json({
        success: false,
        msg: "Wrong password",
      });
    }

    console.log(`✅ Login: ${user.name}`);

    res.json({
      success: true,
      msg: "Login successful",

      user: {
        id: user._id.toString(),
        name: user.name,
      },
    });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err.message);

    res.status(500).json({
      success: false,
      msg: "Login error",
    });
  }
});

/* =====================================================
   POSTS - GET
===================================================== */

app.get("/posts", async (req, res) => {
  try {
    const name = String(req.query.name || "").trim();

    let filter = {};

    if (name) {
      filter.user_name = {
        $regex: `^${escapeRegex(name)}$`,
        $options: "i",
      };
    }

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const formattedPosts = posts.map((p) => ({
      ...p,

      id: p._id.toString(),
      _id: p._id.toString(),

      created_at: p.createdAt || null,
      updated_at: p.updatedAt || null,
    }));

    res.json(formattedPosts);
  } catch (err) {
    console.error("❌ GET POSTS ERROR:", err.message);

    res.status(500).json({
      success: false,
      msg: "Error loading posts",
    });
  }
});

/* =====================================================
   ADD POST
===================================================== */

app.post("/addPost", async (req, res) => {
  try {
    let {
      user_name,
      title,
      description,
      content,
      hindi,
      hinglish,
    } = req.body;

    user_name = String(user_name || "").trim();
    title = String(title || "").trim();
    description = String(description || "").trim();
    content = String(content || "").trim();
    hindi = String(hindi || "").trim();
    hinglish = String(hinglish || "").trim();

    if (!user_name) {
      return res.status(400).json({
        success: false,
        msg: "User name required",
      });
    }

    if (!hinglish && !content) {
      return res.status(400).json({
        success: false,
        msg: "Content required",
      });
    }

    const user = await User.findOne({
      name: {
        $regex: `^${escapeRegex(user_name)}$`,
        $options: "i",
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "User not found. Please login again.",
      });
    }

    const post = await Post.create({
      user_name: user.name,
      title,
      description,
      content,
      hindi,
      hinglish,
    });

    console.log(`📝 New post by ${user.name}`);

    res.json({
      success: true,
      msg: "Post uploaded successfully",

      post: {
        id: post._id.toString(),
        _id: post._id.toString(),

        user_name: post.user_name,
        title: post.title,
        description: post.description,
        content: post.content,
        hindi: post.hindi,
        hinglish: post.hinglish,

        created_at: post.createdAt,
      },
    });
  } catch (err) {
    console.error("❌ ADD POST ERROR:", err.message);

    res.status(500).json({
      success: false,
      msg: "Failed to add post",
    });
  }
});

/* =====================================================
   EDIT POST
===================================================== */

app.post("/editPost", async (req, res) => {
  try {
    const {
      id,
      password,
      content,
      hindi,
      hinglish,
    } = req.body;

    if (!id) {
      return res.json({
        success: false,
        msg: "Post ID required",
      });
    }

    if (!password) {
      return res.json({
        success: false,
        msg: "Password required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({
        success: false,
        msg: "Invalid post ID",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.json({
        success: false,
        msg: "Post not found",
      });
    }

    const user = await User.findOne({
      name: {
        $regex: `^${escapeRegex(post.user_name)}$`,
        $options: "i",
      },
    });

    if (!user) {
      return res.json({
        success: false,
        msg: "Post owner not found",
      });
    }

    const match = await bcrypt.compare(
      String(password),
      user.password
    );

    if (!match) {
      return res.json({
        success: false,
        msg: "Wrong Password",
      });
    }

    post.content = String(content || "").trim();
    post.hindi = String(hindi || "").trim();
    post.hinglish = String(hinglish || "").trim();

    await post.save();

    console.log(`✏️ Post updated: ${id}`);

    res.json({
      success: true,
      msg: "Post updated successfully",
    });
  } catch (err) {
    console.error("❌ EDIT POST ERROR:", err.message);

    res.status(500).json({
      success: false,
      msg: "Update failed",
    });
  }
});

/* =====================================================
   COMMENTS - ADD
===================================================== */

app.post("/comment", async (req, res) => {
  try {
    let {
      post_id,
      user,
      comment,
    } = req.body;

    post_id = String(post_id || "").trim();
    user = String(user || "guest").trim();
    comment = String(comment || "").trim();

    if (!post_id) {
      return res.status(400).json({
        success: false,
        msg: "Post ID required",
      });
    }

    if (!comment) {
      return res.status(400).json({
        success: false,
        msg: "Comment empty",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(post_id)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid post ID",
      });
    }

    const post = await Post.findById(post_id);

    if (!post) {
      return res.status(404).json({
        success: false,
        msg: "Post not found",
      });
    }

    const newComment = await Comment.create({
      post_id: post._id,
      user: user || "guest",
      comment,
    });

    console.log(`💬 Comment added to post: ${post_id}`);

    res.json({
      success: true,
      msg: "Comment added",

      comment: {
        id: newComment._id.toString(),
        post_id: post_id,
        user: newComment.user,
        comment: newComment.comment,
        created_at: newComment.createdAt,
      },
    });
  } catch (err) {
    console.error("❌ ADD COMMENT ERROR:", err.message);

    res.status(500).json({
      success: false,
      msg: "Comment failed",
    });
  }
});

/* =====================================================
   COMMENTS - GET
===================================================== */

app.get("/comments/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json([]);
    }

    const comments = await Comment.find({
      post_id: id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const formattedComments = comments.map((c) => ({
      ...c,

      id: c._id.toString(),
      _id: c._id.toString(),

      post_id: c.post_id.toString(),

      created_at: c.createdAt || null,
      updated_at: c.updatedAt || null,
    }));

    res.json(formattedComments);
  } catch (err) {
    console.error("❌ GET COMMENTS ERROR:", err.message);

    res.status(500).json([]);
  }
});

/* =====================================================
   WRITERS
===================================================== */

app.get("/writers", async (req, res) => {
  try {
    const writers = await Post.aggregate([
      {
        $group: {
          _id: "$user_name",

          total_posts: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          total_posts: -1,
        },
      },
    ]);

    const formattedWriters = writers.map((w) => ({
      user_name: w._id,
      total_posts: w.total_posts,
    }));

    res.json(formattedWriters);
  } catch (err) {
    console.error("❌ GET WRITERS ERROR:", err.message);

    res.status(500).json([]);
  }
});

/* =====================================================
   DELETE POST
===================================================== */

app.delete("/posts/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid post ID",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        msg: "Post not found",
      });
    }

    await Comment.deleteMany({
      post_id: id,
    });

    await Post.findByIdAndDelete(id);

    res.json({
      success: true,
      msg: "Post deleted",
    });
  } catch (err) {
    console.error("❌ DELETE POST ERROR:", err.message);

    res.status(500).json({
      success: false,
      msg: "Delete failed",
    });
  }
});

/* =====================================================
   FRONTEND HOME
===================================================== */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

/* =====================================================
   ERROR HANDLER
===================================================== */

app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err);

  res.status(500).json({
    success: false,
    msg: "Internal server error",
  });
});

/* =====================================================
   SERVER START
===================================================== */

const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log("");
    console.log("======================================");
    console.log("       DIL KI BAATE SERVER");
    console.log("======================================");
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log("🗄️ Database: MongoDB");
    console.log("======================================");
  });
}

module.exports = app;

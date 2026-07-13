"use client";

import { useState } from "react";

interface BlogPost {
  id: number;
  title: string;
  body: string;
  status: "DRAFT" | "PUBLISHED";
}

export default function BlogManagerPage() {
  const [posts, setPosts] = useState<BlogPost[]>([
    {
      id: 1,
      title: "Why WhatsApp is the Future of Social Commerce",
      body: "An analysis of conversion rates on messaging apps vs static sites.",
      status: "PUBLISHED",
    },
  ]);

  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("PUBLISHED");

  const handleSaveDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    const newPost: BlogPost = {
      id: posts.length + 1,
      title,
      body,
      status: "DRAFT",
    };
    setPosts((prev) => [newPost, ...prev]);
    resetForm();
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    const newPost: BlogPost = {
      id: posts.length + 1,
      title,
      body,
      status: "PUBLISHED",
    };
    setPosts((prev) => [newPost, ...prev]);
    resetForm();
  };

  const resetForm = () => {
    setIsComposing(false);
    setTitle("");
    setBody("");
    setStatus("PUBLISHED");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black">Blog Manager</h1>
        {!isComposing && (
          <button
            onClick={() => setIsComposing(true)}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
          >
            New Post
          </button>
        )}
      </div>

      {isComposing ? (
        <div className="max-w-xl border border-zinc-200 dark:border-zinc-800 rounded p-6 bg-white dark:bg-zinc-900 space-y-4">
          <h2 className="text-lg font-bold">New Blog Post</h2>

          <div>
            <label className="block text-sm font-semibold mb-2">Title</label>
            <input
              type="text"
              name="title"
              data-testid="blog-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post Title"
              className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Body (Markdown)</label>
            <textarea
              name="body"
              data-testid="blog-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Post markdown content..."
              className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent h-48"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Status</label>
            <select
              name="status"
              data-testid="blog-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "DRAFT" | "PUBLISHED")}
              className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded bg-[var(--bg)] text-[var(--text)]"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handlePublish}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
            >
              Publish
            </button>
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Save Draft
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-zinc-500 hover:text-zinc-700 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <div key={post.id} className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    post.status === "PUBLISHED"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {post.status}
                  </span>
                </div>
                <h3 className="font-bold text-base mb-1">{post.title}</h3>
                <p className="text-xs text-zinc-500 line-clamp-3">{post.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

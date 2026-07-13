"use client";

import { useState } from "react";

interface Announcement {
  id: number;
  title: string;
  body: string;
  type: "BANNER" | "NOTIFICATION";
  publishedAt: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: 1,
      title: "Google Sheets Sync is Live",
      body: "Connect your sheets to automate inventory and click tracking.",
      type: "BANNER",
      publishedAt: "2026-07-01",
    },
  ]);

  const [isComposing, setIsComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"BANNER" | "NOTIFICATION">("BANNER");

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    const newAnn: Announcement = {
      id: announcements.length + 1,
      title,
      body,
      type,
      publishedAt: new Date().toISOString().split("T")[0],
    };

    setAnnouncements((prev) => [newAnn, ...prev]);
    setIsComposing(false);
    setTitle("");
    setBody("");
    setType("BANNER");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black">Announcements</h1>
        {!isComposing && (
          <button
            onClick={() => setIsComposing(true)}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
          >
            New Announcement
          </button>
        )}
      </div>

      {isComposing ? (
        <form onSubmit={handlePublish} className="max-w-xl border border-zinc-200 dark:border-zinc-800 rounded p-6 bg-white dark:bg-zinc-900 space-y-4">
          <h2 className="text-lg font-bold">Compose Announcement</h2>
          
          <div>
            <label className="block text-sm font-semibold mb-2">Title</label>
            <input
              type="text"
              name="title"
              data-testid="announcement-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement Title"
              className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Body</label>
            <textarea
              name="body"
              data-testid="announcement-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Announcement Content"
              className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent h-24"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Distribution Channel</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type"
                  value="BANNER"
                  data-testid="type-banner"
                  checked={type === "BANNER"}
                  onChange={() => setType("BANNER")}
                />
                Banner
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type"
                  value="NOTIFICATION"
                  data-testid="type-notification"
                  checked={type === "NOTIFICATION"}
                  onChange={() => setType("NOTIFICATION")}
                />
                Notification
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
            >
              Publish to all sellers
            </button>
            <button
              type="button"
              onClick={() => setIsComposing(false)}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div key={ann.id} className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {ann.type}
                  </span>
                  <span className="text-xs text-zinc-500">{ann.publishedAt}</span>
                </div>
                <h3 className="font-bold text-base">{ann.title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{ann.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

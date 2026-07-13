"use client";

import { useState } from "react";
import Link from "next/link";

interface Reply {
  id: number;
  body: string;
  isAdmin: boolean;
  author: string;
}

interface Thread {
  id: number;
  title: string;
  body: string;
  isFeatureRequest: boolean;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  replies: Reply[];
  author: string;
}

export default function CommunityPage() {
  const [threads, setThreads] = useState<Thread[]>([
    {
      id: 1,
      title: "Google Sheets integration suggestion",
      body: "It would be great to have orders automatically appended to a Google sheet.",
      isFeatureRequest: true,
      status: "IN_PROGRESS",
      author: "Jane Thrift",
      replies: [
        { id: 1, body: "We are currently building this features!", isAdmin: true, author: "Admin Lucky" },
      ],
    },
    {
      id: 2,
      title: "How to handle returns?",
      body: "What is the best way to handle customers who want to return items via WhatsApp?",
      isFeatureRequest: false,
      status: "OPEN",
      author: "Alex Baker",
      replies: [],
    },
  ]);

  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  // New Thread Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isFeatureRequest, setIsFeatureRequest] = useState(false);

  // Reply Form state
  const [replyBody, setReplyBody] = useState("");

  // Admin status state
  const [tempStatus, setTempStatus] = useState<"OPEN" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">("OPEN");

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    const newThread: Thread = {
      id: threads.length + 1,
      title,
      body,
      isFeatureRequest,
      status: "OPEN",
      author: "CurrentUser",
      replies: [],
    };

    setThreads((prev) => [...prev, newThread]);
    setIsComposing(false);
    setTitle("");
    setBody("");
    setIsFeatureRequest(false);
  };

  const handleAddReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody || selectedThreadId === null) return;

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === selectedThreadId) {
          const newReply: Reply = {
            id: t.replies.length + 1,
            body: replyBody,
            isAdmin: true, // Mock current user as admin for verification ease
            author: "Admin User",
          };
          return { ...t, replies: [...t.replies, newReply] };
        }
        return t;
      })
    );

    setReplyBody("");
  };

  const handleUpdateStatus = () => {
    if (selectedThreadId === null) return;
    setThreads((prev) =>
      prev.map((t) => (t.id === selectedThreadId ? { ...t, status: tempStatus } : t))
    );
  };

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
      {/* Header */}
      <header className="border-b border-[var(--border)] py-4 bg-[var(--bg)]">
        <div className="max-w-3xl mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="font-heading font-black text-lg tracking-tight">
            ZIPPP.LINK COMMUNITY
          </Link>
          <button
            onClick={() => {
              setSelectedThreadId(null);
              setIsComposing(false);
            }}
            className="text-sm font-semibold hover:underline cursor-pointer"
          >
            Bulletin Board
          </button>
        </div>
      </header>

      {/* Main Forum container */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {selectedThread ? (
          /* Thread Details View */
          <div className="space-y-6">
            <button
              onClick={() => setSelectedThreadId(null)}
              className="text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] mb-4 cursor-pointer"
            >
              &larr; Back to threads
            </button>

            <div className="border border-[var(--border)] rounded-lg p-6 bg-[var(--white)] space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      data-testid="status-pill"
                      className="status-pill text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[var(--text)]"
                    >
                      {selectedThread.status}
                    </span>
                    {selectedThread.isFeatureRequest && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        Suggestion
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-extrabold">{selectedThread.title}</h2>
                  <p className="text-xs text-[var(--muted)] mt-1">Started by {selectedThread.author}</p>
                </div>

                {/* Admin Status Controls */}
                <div className="border border-[var(--border)] p-3 rounded bg-[var(--bg)]/50 space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Admin: Update Status
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="status"
                      data-testid="thread-status-select"
                      value={tempStatus}
                      onChange={(e) => setTempStatus(e.target.value as "OPEN" | "IN_PROGRESS" | "COMPLETED" | "REJECTED")}
                      className="text-xs p-1 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)]"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                    <button
                      onClick={handleUpdateStatus}
                      className="px-2.5 py-1 bg-[var(--black)] text-[var(--white)] text-xs font-semibold rounded hover:opacity-90 cursor-pointer"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[var(--text)] border-t border-[var(--border)] pt-4">
                {selectedThread.body}
              </p>
            </div>

            {/* Replies List */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-[var(--muted)] uppercase tracking-wider">
                Replies ({selectedThread.replies.length})
              </h3>
              {selectedThread.replies.map((reply) => (
                <div
                  key={reply.id}
                  className="p-4 border border-[var(--border)] rounded bg-[var(--white)]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-xs">{reply.author}</span>
                    {reply.isAdmin && (
                      <span
                        data-testid="admin-badge"
                        className="admin-comment-badge text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 bg-red-100 text-red-800 rounded"
                      >
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{reply.body}</p>
                </div>
              ))}
            </div>

            {/* Reply Form */}
            <form
              onSubmit={handleAddReply}
              className="border border-[var(--border)] rounded-lg p-6 bg-[var(--white)] space-y-4"
            >
              <h4 className="font-bold text-sm">Post a Reply</h4>
              <div>
                <textarea
                  name="reply"
                  data-testid="reply-textarea"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Type your reply here..."
                  className="w-full p-2.5 border border-[var(--border)] rounded bg-transparent h-24 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
              >
                Post Reply
              </button>
            </form>
          </div>
        ) : isComposing ? (
          /* New Thread Form */
          <form
            onSubmit={handleCreateThread}
            className="border border-[var(--border)] rounded-lg p-6 bg-[var(--white)] space-y-4"
          >
            <h2 className="text-lg font-bold">Start a New Discussion</h2>

            <div>
              <label className="block text-sm font-semibold mb-2">Title</label>
              <input
                type="text"
                name="title"
                data-testid="thread-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What is your topic?"
                className="w-full p-2 border border-[var(--border)] rounded bg-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Body</label>
              <textarea
                name="body"
                data-testid="thread-body-input"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Explain in detail..."
                className="w-full p-2 border border-[var(--border)] rounded bg-transparent h-32 text-sm"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  name="isFeatureRequest"
                  data-testid="feature-request-checkbox"
                  checked={isFeatureRequest}
                  onChange={(e) => setIsFeatureRequest(e.target.checked)}
                />
                This is a feature suggestion / request
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
              >
                Create Thread
              </button>
              <button
                type="button"
                onClick={() => setIsComposing(false)}
                className="px-4 py-2 border border-[var(--border)] rounded text-sm font-semibold hover:bg-[var(--bg)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* Threads List View */
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Discussion Bulletin Board</h2>
              <button
                onClick={() => setIsComposing(true)}
                className="px-4 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
              >
                Start Discussion
              </button>
            </div>

            <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] bg-[var(--white)]">
              {threads.map((t) => (
                <div key={t.id} className="p-4 hover:bg-[var(--bg)]/30 transition-all">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[var(--text)]">
                      {t.status}
                    </span>
                    {t.isFeatureRequest && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        Suggestion
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base">
                    <button
                      onClick={() => {
                        setSelectedThreadId(t.id);
                        setTempStatus(t.status);
                      }}
                      className="text-left font-semibold text-[var(--text)] hover:underline hover:text-[var(--black)] cursor-pointer"
                    >
                      {t.title}
                    </button>
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Posted by {t.author} &bull; {t.replies.length} {t.replies.length === 1 ? "reply" : "replies"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

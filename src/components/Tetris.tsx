"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Small Tetris for the 404 page. Canvas board, keyboard on desktop, on-screen
 * controls on mobile. All copy comes in through `labels`.
 */
const COLS = 10;
const ROWS = 20;
const CELL = 24;

const SHAPES: number[][][] = [
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
    ],
    [
        [1, 1],
        [1, 1],
    ],
    [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
    ],
    [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
    ],
];

const COLORS = [
    "",
    "#3e0f0c",
    "#ee5329",
    "#c73a12",
    "#1c0b09",
    "#5e4640",
    "#c9cfd9",
    "#f6d3c5",
];

const LINE_SCORE = [0, 100, 300, 500, 800];

type Piece = { m: number[][]; x: number; y: number; color: number };
type Status = "idle" | "running" | "paused" | "over";

export type TetrisLabels = {
    play: string;
    over: string;
    restart: string;
    paused: string;
    resume: string;
    pause: string;
    score: string;
    lines: string;
    controls: string;
    left: string;
    right: string;
    rotate: string;
    down: string;
    drop: string;
};

type Engine = {
    start: () => void;
    pause: () => void;
    resume: () => void;
    move: (dx: number) => void;
    rotate: () => void;
    soft: () => void;
    hard: () => void;
};

function emptyBoard(): number[][] {
    return Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
}

function rotateMatrix(m: number[][]): number[][] {
    const n = m.length;
    const out = Array.from({ length: n }, () => Array<number>(n).fill(0));
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            out[c][n - 1 - r] = m[r][c];
        }
    }
    return out;
}

function collide(board: number[][], piece: Piece): boolean {
    const { m, x, y } = piece;
    for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
            if (!m[r][c]) continue;
            const bx = x + c;
            const by = y + r;
            if (bx < 0 || bx >= COLS || by >= ROWS) return true;
            if (by >= 0 && board[by][bx]) return true;
        }
    }
    return false;
}

function spawn(): Piece {
    const index = Math.floor(Math.random() * SHAPES.length);
    const m = SHAPES[index].map((row) => [...row]);
    return {
        m,
        x: Math.floor((COLS - m[0].length) / 2),
        y: 0,
        color: index + 1,
    };
}

const CONTROL_BTN =
    "rounded-lg border-2 border-line bg-card py-2 text-body hover:bg-surface";

export default function Tetris({ labels }: { labels: TetrisLabels }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        const g: CanvasRenderingContext2D = ctx;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = COLS * CELL * dpr;
        canvas.height = ROWS * CELL * dpr;
        canvas.style.width = `${COLS * CELL}px`;
        canvas.style.height = `${ROWS * CELL}px`;
        g.scale(dpr, dpr);

        const board = emptyBoard();
        let piece: Piece | null = null;
        let running = false;
        let timer: number | null = null;
        let scoreValue = 0;
        let linesValue = 0;

        function clearTimer() {
            if (timer !== null) {
                window.clearTimeout(timer);
                timer = null;
            }
        }

        function drawCell(col: number, row: number, color: number) {
            const x = col * CELL;
            const y = row * CELL;
            if (!color) {
                g.fillStyle = "#ffffff";
                g.fillRect(x, y, CELL, CELL);
                g.strokeStyle = "rgba(28,11,9,0.08)";
                g.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
                return;
            }
            g.fillStyle = COLORS[color] || "#3e0f0c";
            g.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
            g.fillStyle = "rgba(255,255,255,0.18)";
            g.fillRect(x + 1, y + 1, CELL - 2, 4);
        }

        function draw() {
            g.fillStyle = "#ffffff";
            g.fillRect(0, 0, COLS * CELL, ROWS * CELL);
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    drawCell(c, r, board[r][c]);
                }
            }
            if (!piece) return;
            for (let r = 0; r < piece.m.length; r++) {
                for (let c = 0; c < piece.m[r].length; c++) {
                    if (piece.m[r][c] && piece.y + r >= 0) {
                        drawCell(piece.x + c, piece.y + r, piece.color);
                    }
                }
            }
        }

        function clearLines(): number {
            let cleared = 0;
            for (let r = ROWS - 1; r >= 0; r--) {
                if (board[r].every((v) => v)) {
                    board.splice(r, 1);
                    board.unshift(Array<number>(COLS).fill(0));
                    cleared++;
                    r++;
                }
            }
            return cleared;
        }

        function schedule() {
            clearTimer();
            if (!running) return;
            const speed = Math.max(120, 700 - linesValue * 20);
            timer = window.setTimeout(tick, speed);
        }

        function lock() {
            if (!piece) return;
            for (let r = 0; r < piece.m.length; r++) {
                for (let c = 0; c < piece.m[r].length; c++) {
                    if (piece.m[r][c] && piece.y + r >= 0) {
                        board[piece.y + r][piece.x + c] = piece.color;
                    }
                }
            }
            const cleared = clearLines();
            if (cleared > 0) {
                linesValue += cleared;
                scoreValue += LINE_SCORE[cleared] ?? 0;
                setLines(linesValue);
                setScore(scoreValue);
            }
            const next = spawn();
            piece = next;
            if (collide(board, next)) {
                running = false;
                clearTimer();
                setStatus("over");
            }
        }

        function tick() {
            if (!running || !piece) return;
            const next = { ...piece, y: piece.y + 1 };
            if (collide(board, next)) {
                lock();
            } else {
                piece = next;
            }
            draw();
            schedule();
        }

        function start() {
            for (let r = 0; r < ROWS; r++) board[r].fill(0);
            piece = spawn();
            running = true;
            scoreValue = 0;
            linesValue = 0;
            setScore(0);
            setLines(0);
            setStatus("running");
            draw();
            schedule();
        }

        function pause() {
            if (!running) return;
            running = false;
            clearTimer();
            setStatus("paused");
        }

        function resume() {
            if (running || !piece) return;
            running = true;
            setStatus("running");
            schedule();
        }

        function move(dx: number) {
            if (!running || !piece) return;
            const next = { ...piece, x: piece.x + dx };
            if (!collide(board, next)) {
                piece = next;
                draw();
            }
        }

        function rotate() {
            if (!running || !piece) return;
            const m = rotateMatrix(piece.m);
            for (const dx of [0, -1, 1, -2, 2]) {
                const next = { ...piece, m, x: piece.x + dx };
                if (!collide(board, next)) {
                    piece = next;
                    draw();
                    return;
                }
            }
        }

        function soft() {
            if (!running || !piece) return;
            const next = { ...piece, y: piece.y + 1 };
            if (collide(board, next)) {
                lock();
                draw();
                schedule();
            } else {
                piece = next;
                draw();
            }
        }

        function hard() {
            if (!running || !piece) return;
            let y = piece.y;
            while (!collide(board, { ...piece, y: y + 1 })) y++;
            piece = { ...piece, y };
            lock();
            draw();
            schedule();
        }

        engineRef.current = { start, pause, resume, move, rotate, soft, hard };
        draw();

        function onKey(event: KeyboardEvent) {
            if (!running) return;
            switch (event.key) {
                case "ArrowLeft":
                    event.preventDefault();
                    move(-1);
                    break;
                case "ArrowRight":
                    event.preventDefault();
                    move(1);
                    break;
                case "ArrowDown":
                    event.preventDefault();
                    soft();
                    break;
                case "ArrowUp":
                case "x":
                case "X":
                    event.preventDefault();
                    rotate();
                    break;
                case " ":
                    event.preventDefault();
                    hard();
                    break;
                case "p":
                case "P":
                    event.preventDefault();
                    pause();
                    break;
                default:
                    break;
            }
        }

        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            clearTimer();
            engineRef.current = null;
        };
    }, []);

    return (
        <div className="mt-8 flex w-full max-w-[280px] flex-col items-center">
            <div className="mb-3 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
                <span>
                    {labels.score} <span className="text-body">{score}</span>
                </span>
                <span>
                    {labels.lines} <span className="text-body">{lines}</span>
                </span>
            </div>

            <div className="relative w-fit">
                <canvas
                    ref={canvasRef}
                    className="rounded-panel border-2 border-line bg-card"
                    aria-label={labels.controls}
                />
                {status !== "running" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-panel bg-card text-center">
                        {status === "over" ? (
                            <p className="font-head text-xl font-extrabold">
                                {labels.over}
                            </p>
                        ) : status === "paused" ? (
                            <p className="font-head text-xl font-extrabold">
                                {labels.paused}
                            </p>
                        ) : null}
                        <button
                            type="button"
                            onClick={() =>
                                status === "paused"
                                    ? engineRef.current?.resume()
                                    : engineRef.current?.start()
                            }
                            className="rounded-full bg-btn px-6 py-2 text-sm font-semibold text-btntext"
                        >
                            {status === "over"
                                ? labels.restart
                                : status === "paused"
                                  ? labels.resume
                                  : labels.play}
                        </button>
                    </div>
                ) : null}
            </div>

            <div className="mt-4 grid w-full grid-cols-3 gap-2 text-base font-semibold">
                <button
                    type="button"
                    aria-label={labels.left}
                    onClick={() => engineRef.current?.move(-1)}
                    className={CONTROL_BTN}
                >
                    ←
                </button>
                <button
                    type="button"
                    aria-label={labels.rotate}
                    onClick={() => engineRef.current?.rotate()}
                    className={CONTROL_BTN}
                >
                    ⟳
                </button>
                <button
                    type="button"
                    aria-label={labels.right}
                    onClick={() => engineRef.current?.move(1)}
                    className={CONTROL_BTN}
                >
                    →
                </button>
                <button
                    type="button"
                    aria-label={labels.down}
                    onClick={() => engineRef.current?.soft()}
                    className={CONTROL_BTN}
                >
                    ↓
                </button>
                <button
                    type="button"
                    aria-label={labels.drop}
                    onClick={() => engineRef.current?.hard()}
                    className={`${CONTROL_BTN} col-span-2`}
                >
                    {labels.drop}
                </button>
            </div>

            {status === "running" ? (
                <button
                    type="button"
                    onClick={() => engineRef.current?.pause()}
                    className="mt-3 text-xs font-semibold text-muted underline"
                >
                    {labels.pause}
                </button>
            ) : null}

            <p className="mt-3 text-center text-xs text-muted">
                {labels.controls}
            </p>
        </div>
    );
}

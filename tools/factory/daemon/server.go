package main

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"
)

func hostGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h, _, err := net.SplitHostPort(r.Host)
		if err != nil {
			h = r.Host
		}
		h = strings.Trim(h, "[]")
		if h != "127.0.0.1" && h != "localhost" && h != "::1" {
			http.Error(w, "forbidden host", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", a.handleHealth)
	mux.HandleFunc("/api/snapshot", a.handleSnapshot)
	mux.HandleFunc("/ws", a.handleWebSocket)
	return hostGuard(mux)
}

func (a *App) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, map[string]any{
		"ok":       true,
		"entities": a.EntityCount(),
		"seq":      a.hub.CurrentSeq(),
	})
}

func (a *App) handleSnapshot(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, a.hub.Snapshot())
}

func (a *App) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	a.hub.ServeHTTP(w, r)
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		http.Error(w, "encode failed", http.StatusInternalServerError)
	}
}

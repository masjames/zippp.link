package main

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	clientSendBuffer = 64
	writeWait        = 10 * time.Second
	pongWait         = 60 * time.Second
	pingPeriod       = 30 * time.Second
	maxMessageBytes  = 64 * 1024
)

type inbound struct {
	Type    string `json:"type"`
	ID      string `json:"id"`
	Message string `json:"message"`
}

type client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

// Hub owns the WebSocket clients and the sequence counter.
type Hub struct {
	mu         sync.Mutex
	seq        int64
	clients    map[*client]struct{}
	snapshotFn func() map[string]any
	upgrader   websocket.Upgrader
	done       chan struct{}
	closeOnce  sync.Once

	OnVerify    func(id string) error
	OnThread    func(id string) (string, error)
	OnGroomChat func(id, message string) error
	OnBuild     func(id string) error
}

func NewHub(snapshotFn func() map[string]any, allowedOrigins []string) *Hub {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		allowed[origin] = struct{}{}
	}
	hub := &Hub{
		seq:        1,
		clients:    make(map[*client]struct{}),
		snapshotFn: snapshotFn,
		done:       make(chan struct{}),
	}
	hub.upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true
			}
			_, ok := allowed[origin]
			return ok
		},
	}
	return hub
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	c := &client{hub: h, conn: conn, send: make(chan []byte, clientSendBuffer)}
	if !h.addClient(c) {
		conn.Close()
		return
	}
	go c.writePump()
	c.readPump()
}

func (h *Hub) addClient(c *client) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	b, err := json.Marshal(h.snapshotLocked())
	if err != nil {
		return false
	}
	h.clients[c] = struct{}{}
	select {
	case c.send <- b:
		return true
	default:
		delete(h.clients, c)
		close(c.send)
		return false
	}
}

func (h *Hub) removeClient(c *client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
	h.mu.Unlock()
}

func (h *Hub) CurrentSeq() int64 {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.seq
}

func (h *Hub) Snapshot() map[string]any {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.snapshotLocked()
}

func (h *Hub) snapshotLocked() map[string]any {
	snap := h.snapshotFn()
	if snap == nil {
		snap = map[string]any{}
	}
	out := make(map[string]any, len(snap)+1)
	for k, v := range snap {
		out[k] = v
	}
	if _, ok := out["entities"]; !ok {
		out["entities"] = []any{}
	}
	if _, ok := out["errors"]; !ok {
		out["errors"] = []any{}
	}
	if _, ok := out["verifications"]; !ok {
		out["verifications"] = map[string]any{}
	}
	out["seq"] = h.seq
	out["type"] = "snapshot"
	return out
}

func (h *Hub) Broadcast(typ string, fields map[string]any) {
	h.broadcast(typ, fields, true)
}

func (h *Hub) BroadcastNoSeq(typ string, fields map[string]any) {
	h.broadcast(typ, fields, false)
}

func (h *Hub) broadcast(typ string, fields map[string]any, withSeq bool) {
	h.mu.Lock()
	if withSeq {
		h.seq++
	}
	msg := make(map[string]any, len(fields)+2)
	msg["type"] = typ
	if withSeq {
		msg["seq"] = h.seq
	}
	for k, v := range fields {
		msg[k] = v
	}
	b, err := json.Marshal(msg)
	if err != nil {
		h.mu.Unlock()
		return
	}
	var drop []*client
	for c := range h.clients {
		select {
		case c.send <- b:
		default:
			drop = append(drop, c)
		}
	}
	for _, c := range drop {
		delete(h.clients, c)
		close(c.send)
	}
	h.mu.Unlock()
	for _, c := range drop {
		c.conn.Close()
	}
}

func (h *Hub) sendSnapshot(c *client) {
	h.mu.Lock()
	b, err := json.Marshal(h.snapshotLocked())
	if err != nil {
		h.mu.Unlock()
		return
	}
	dropped := false
	if _, ok := h.clients[c]; ok {
		select {
		case c.send <- b:
		default:
			delete(h.clients, c)
			close(c.send)
			dropped = true
		}
	}
	h.mu.Unlock()
	if dropped {
		c.conn.Close()
	}
}

func (h *Hub) sendToClient(c *client, value any) {
	b, err := json.Marshal(value)
	if err != nil {
		return
	}
	h.mu.Lock()
	dropped := false
	if _, ok := h.clients[c]; ok {
		select {
		case c.send <- b:
		default:
			delete(h.clients, c)
			close(c.send)
			dropped = true
		}
	}
	h.mu.Unlock()
	if dropped {
		c.conn.Close()
	}
}

func (h *Hub) sendError(c *client, message string) {
	h.sendToClient(c, map[string]any{"type": "error", "message": message})
}

func (h *Hub) sendGroomThread(c *client, id, thread string) {
	h.sendToClient(c, map[string]any{"type": "groom_thread", "id": id, "thread": thread})
}

func (h *Hub) sendGroomChatResult(c *client, id string, ok bool, thread, message string) {
	h.sendToClient(c, map[string]any{
		"type":   "groom_chat_result",
		"id":     id,
		"ok":     ok,
		"thread": thread,
		"error":  message,
	})
}

func (h *Hub) Close() {
	h.closeOnce.Do(func() {
		close(h.done)
		h.mu.Lock()
		clients := make([]*client, 0, len(h.clients))
		for c := range h.clients {
			clients = append(clients, c)
			delete(h.clients, c)
			close(c.send)
		}
		h.mu.Unlock()
		for _, c := range clients {
			c.conn.Close()
		}
	})
}

func (c *client) readPump() {
	defer func() {
		c.hub.removeClient(c)
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageBytes)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		var in inbound
		if err := json.Unmarshal(message, &in); err != nil {
			c.hub.sendError(c, "invalid message")
			continue
		}
		switch in.Type {
		case "resync":
			c.hub.sendSnapshot(c)
		case "verify":
			if c.hub.OnVerify == nil {
				c.hub.sendError(c, "verify handler not configured")
				continue
			}
			if err := c.hub.OnVerify(in.ID); err != nil {
				c.hub.sendError(c, err.Error())
			}
		case "groom_thread":
			if c.hub.OnThread == nil {
				c.hub.sendError(c, "groom thread handler not configured")
				continue
			}
			thread, err := c.hub.OnThread(in.ID)
			if err != nil {
				c.hub.sendError(c, err.Error())
				continue
			}
			c.hub.sendGroomThread(c, in.ID, thread)
		case "groom_chat":
			if c.hub.OnGroomChat == nil {
				c.hub.sendGroomChatResult(c, in.ID, false, "", "groom chat handler not configured")
				continue
			}
			if err := c.hub.OnGroomChat(in.ID, in.Message); err != nil {
				c.hub.sendGroomChatResult(c, in.ID, false, "", err.Error())
			}
		case "build":
			if c.hub.OnBuild == nil {
				c.hub.sendError(c, "build handler not configured")
				continue
			}
			if err := c.hub.OnBuild(in.ID); err != nil {
				c.hub.sendError(c, err.Error())
			}
		default:
			c.hub.sendError(c, "unknown message type")
		}
	}
}

func (c *client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case <-c.hub.done:
			return
		}
	}
}

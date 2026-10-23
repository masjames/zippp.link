package main

import (
	"net/http"
	"testing"

	"github.com/gorilla/websocket"
)

func TestHubSnapshotResyncAndUnknown(t *testing.T) {
	_, _, wsURL := newTestApp(t)
	conn := dialWS(t, wsURL, nil)

	first := readWS(t, conn)
	if first.Type != "snapshot" {
		t.Fatalf("first message = %q", first.Type)
	}
	if first.Seq < 1 {
		t.Fatalf("snapshot seq = %d", first.Seq)
	}
	if len(first.Entities) != 0 {
		t.Fatalf("unexpected entities: %+v", first.Entities)
	}

	if err := conn.WriteJSON(map[string]string{"type": "resync"}); err != nil {
		t.Fatal(err)
	}
	resync := readWS(t, conn)
	if resync.Type != "snapshot" {
		t.Fatalf("resync message = %q", resync.Type)
	}

	if err := conn.WriteJSON(map[string]string{"type": "bogus"}); err != nil {
		t.Fatal(err)
	}
	unknown := readWS(t, conn)
	if unknown.Type != "error" || unknown.Message == "" {
		t.Fatalf("unexpected unknown-type reply: %+v", unknown)
	}
}

func TestHubRejectsBadOrigin(t *testing.T) {
	_, _, wsURL := newTestApp(t)
	_, _, err := websocket.DefaultDialer.Dial(wsURL, http.Header{"Origin": []string{"http://evil.com"}})
	if err == nil {
		t.Fatal("bad Origin was accepted")
	}
}

func TestHubSequenceIncreases(t *testing.T) {
	app, _, wsURL := newTestApp(t)
	conn := dialWS(t, wsURL, nil)

	first := readWS(t, conn)
	if first.Type != "snapshot" {
		t.Fatalf("first message = %q", first.Type)
	}
	app.hub.Broadcast("diff", emptyDiff())
	second := readWS(t, conn)
	if second.Type != "diff" || second.Seq != first.Seq+1 {
		t.Fatalf("second = %+v, first seq = %d", second, first.Seq)
	}
	app.hub.Broadcast("diff", emptyDiff())
	third := readWS(t, conn)
	if third.Type != "diff" || third.Seq != second.Seq+1 {
		t.Fatalf("third = %+v, second seq = %d", third, second.Seq)
	}
}

package main

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestHealthz(t *testing.T) {
	_, server, _ := newTestApp(t)
	resp, err := server.Client().Get(server.URL + "/healthz")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var body struct {
		OK       bool  `json:"ok"`
		Entities int   `json:"entities"`
		Seq      int64 `json:"seq"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if !body.OK || body.Entities != 0 || body.Seq < 1 {
		t.Fatalf("unexpected health body: %+v", body)
	}
}

func TestHostGuardRejectsBadHost(t *testing.T) {
	_, server, _ := newTestApp(t)
	req, err := http.NewRequest(http.MethodGet, server.URL+"/healthz", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Host = "evil.com"
	resp, err := server.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", resp.StatusCode)
	}
}

func TestSnapshotRoute(t *testing.T) {
	_, server, _ := newTestApp(t)
	resp, err := server.Client().Get(server.URL + "/api/snapshot")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var body struct {
		Entities []map[string]any `json:"entities"`
		Seq      int64            `json:"seq"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if len(body.Entities) != 0 || body.Seq < 1 {
		t.Fatalf("unexpected snapshot: %+v", body)
	}
}

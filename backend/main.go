// On-Call RPG backend (reference). Serves a Prometheus-style mock metrics
// endpoint and a leaderboard API. Deploy via infra/terraform.
package main

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"sort"
	"sync"
	"time"
)

type Entry struct {
	Name     string `json:"name"`
	Scenario string `json:"scenario"`
	Total    int    `json:"total"`
	MTTR     int    `json:"mttr"`
}

var (
	mu    sync.Mutex
	board []Entry
)

func metrics(w http.ResponseWriter, _ *http.Request) {
	t := float64(time.Now().Unix())
	w.Header().Set("Content-Type", "text/plain; version=0.0.4")
	fmt.Fprintf(w, "# TYPE container_cpu_usage gauge\ncontainer_cpu_usage{service=\"checkout-api\"} %.2f\n", 60+35*math.Sin(t/30))
	fmt.Fprintf(w, "# TYPE pg_stat_activity_count gauge\npg_stat_activity_count{db=\"orders\"} %.0f\n", 250+240*math.Sin(t/45))
}

func leaderboard(w http.ResponseWriter, r *http.Request) {
	mu.Lock()
	defer mu.Unlock()
	if r.Method == http.MethodPost {
		var e Entry
		if err := json.NewDecoder(r.Body).Decode(&e); err != nil || e.Name == "" {
			http.Error(w, "bad entry", 400)
			return
		}
		board = append(board, e)
		sort.Slice(board, func(i, j int) bool { return board[i].Total > board[j].Total })
		if len(board) > 50 {
			board = board[:50]
		}
	}
	json.NewEncoder(w).Encode(board)
}

func main() {
	http.HandleFunc("/metrics", metrics)
	http.HandleFunc("/api/leaderboard", leaderboard)
	http.ListenAndServe(":8080", nil)
}

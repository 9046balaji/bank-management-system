package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type Worker struct {
	db *sql.DB
}

func main() {
	port := getEnv("PORT", "8080")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "aurabank")
	dbPass := getEnv("DB_PASSWORD", "local_dev_password")
	dbName := getEnv("DB_NAME", "payments_db")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to payments_db: %v", err)
	}
	defer db.Close()

	worker := &Worker{db: db}

	// Start outbox polling loop in a goroutine
	go worker.startPollingLoop()

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz/startup", worker.handleStartup)
	mux.HandleFunc("/healthz/live", worker.handleLive)
	mux.HandleFunc("/healthz/ready", worker.handleReady)
	mux.Handle("/metrics", promhttp.Handler())

	log.Printf("Outbox Worker running on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Outbox Worker HTTP server failed: %v", err)
	}
}

func (w *Worker) startPollingLoop() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	log.Println("Outbox Worker polling loop started (FOR UPDATE SKIP LOCKED)...")

	for range ticker.C {
		// Atomic lock-and-fetch query
		query := `
			WITH locked AS (
				SELECT id FROM outbox_events
				WHERE status = 'PENDING'
				  AND (locked_until IS NULL OR locked_until < NOW())
				ORDER BY created_at ASC
				LIMIT 10
				FOR UPDATE SKIP LOCKED
			)
			UPDATE outbox_events
			SET locked_until = NOW() + INTERVAL '30 seconds'
			WHERE id IN (SELECT id FROM locked)
			RETURNING id, aggregate_type, aggregate_id, event_type, payload, retry_count;
		`

		rows, err := w.db.Query(query)
		if err != nil {
			log.Printf("Error polling outbox events: %v", err)
			continue
		}

		for rows.Next() {
			var id, aggType, aggID, eventType, payload string
			var retryCount int
			if err := rows.Scan(&id, &aggType, &aggID, &eventType, &payload, &retryCount); err != nil {
				log.Printf("Error scanning outbox row: %v", err)
				continue
			}

			// Simulate publishing to Kafka broker
			log.Printf("[OUTBOX] Publishing event %s (%s) for aggregate %s to Kafka...", eventType, id, aggID)

			// Mark event as PROCESSED
			_, err = w.db.Exec("UPDATE outbox_events SET status = 'PROCESSED', processed_at = NOW() WHERE id = $1", id)
			if err != nil {
				log.Printf("Failed to update outbox event %s status: %v", id, err)
			}
		}
		rows.Close()
	}
}

func (w *Worker) handleStartup(rw http.ResponseWriter, r *http.Request) {
	rw.WriteHeader(http.StatusOK)
	json.NewEncoder(rw).Encode(map[string]string{"status": "ok", "service": "outbox-worker"})
}

func (w *Worker) handleLive(rw http.ResponseWriter, r *http.Request) {
	rw.WriteHeader(http.StatusOK)
	json.NewEncoder(rw).Encode(map[string]string{"status": "live"})
}

func (w *Worker) handleReady(rw http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if err := w.db.PingContext(ctx); err != nil {
		http.Error(rw, `{"status":"not ready"}`, http.StatusServiceUnavailable)
		return
	}
	rw.WriteHeader(http.StatusOK)
	json.NewEncoder(rw).Encode(map[string]string{"status": "ready"})
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}

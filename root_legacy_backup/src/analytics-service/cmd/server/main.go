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

type Server struct {
	db *sql.DB
}

func main() {
	port := getEnv("PORT", "8080")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "aurabank")
	dbPass := getEnv("DB_PASSWORD", "local_dev_password")
	dbName := getEnv("DB_NAME", "analytics_db")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open analytics_db connection: %v", err)
	}
	defer db.Close()

	srv := &Server{db: db}

	// Start simulated Kafka event consumer loop in background
	go srv.startKafkaEventConsumer()

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz/startup", srv.handleStartup)
	mux.HandleFunc("/healthz/live", srv.handleLive)
	mux.HandleFunc("/healthz/ready", srv.handleReady)
	mux.HandleFunc("/api/v1/analytics/overview", srv.handleOverview)
	mux.Handle("/metrics", promhttp.Handler())

	log.Printf("Analytics Service running on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Analytics Service HTTP server failed: %v", err)
	}
}

func (s *Server) startKafkaEventConsumer() {
	log.Println("Analytics Service event consumer subscribed to Kafka topics: [payment.completed, loan.disbursed, loan.repayment.received, card.issued]")
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// Event processing simulation
	}
}

func (s *Server) handleOverview(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query("SELECT metric_name, metric_value FROM executive_metrics")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	metrics := make(map[string]float64)
	for rows.Next() {
		var name string
		var val float64
		if err := rows.Scan(&name, &val); err == nil {
			metrics[name] = val
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"metrics": metrics,
	})
}

func (s *Server) handleStartup(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if err := s.db.PingContext(ctx); err != nil {
		http.Error(w, `{"status":"starting","reason":"db ping failed"}`, http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "analytics-service"})
}

func (s *Server) handleLive(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "live"})
}

func (s *Server) handleReady(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if err := s.db.PingContext(ctx); err != nil {
		http.Error(w, `{"status":"not ready","reason":"db down"}`, http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ready", "database": "analytics_db"})
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}

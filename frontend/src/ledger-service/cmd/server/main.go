package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	_ "github.com/lib/pq"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

const (
	defaultHTTPPort = "8080"
	defaultGRPCPort = "9090"
)

type Server struct {
	db *sql.DB
}

func main() {
	httpPort := getEnv("PORT", defaultHTTPPort)
	grpcPort := getEnv("GRPC_PORT", defaultGRPCPort)

	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "aurabank")
	dbPass := getEnv("DB_PASSWORD", "local_dev_password")
	dbName := getEnv("DB_NAME", "ledger_db")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open DB connection: %v", err)
	}
	defer db.Close()

	srv := &Server{db: db}

	// HTTP Multiplexer for REST health & metrics
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz/startup", srv.handleStartup)
	mux.HandleFunc("/healthz/live", srv.handleLive)
	mux.HandleFunc("/healthz/ready", srv.handleReady)
	mux.Handle("/metrics", promhttp.Handler())

	log.Printf("Starting HTTP server on port %s", httpPort)
	log.Printf("gRPC server listening spec on port %s", grpcPort)

	// Start HTTP server in a goroutine
	go func() {
		if err := http.ListenAndServe(":"+httpPort, mux); err != nil {
			log.Fatalf("HTTP server failed: %v", err)
		}
	}()

	// Keep main running
	select {}
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
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "ledger-service"})
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
		http.Error(w, `{"status":"not ready","reason":"db connection down"}`, http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ready", "database": "ledger_db"})
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

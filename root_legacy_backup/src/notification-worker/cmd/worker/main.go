package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	port := getEnv("PORT", "8080")

	// Start simulated Kafka consumer loop
	go startKafkaConsumer()

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz/startup", handleStartup)
	mux.HandleFunc("/healthz/live", handleLive)
	mux.HandleFunc("/healthz/ready", handleReady)
	mux.Handle("/metrics", promhttp.Handler())

	log.Printf("Notification Worker running on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Notification Worker HTTP server failed: %v", err)
	}
}

func startKafkaConsumer() {
	log.Println("Notification Worker Kafka consumer subscribed to topics: [payment.completed, payment.failed, loan.disbursed, card.issued, card.frozen, notifications.email]")

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// Event dispatch simulation
		log.Println("[NOTIFICATION WORKER] Listening for Kafka events...")
	}
}

func handleStartup(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "notification-worker"})
}

func handleLive(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "live"})
}

func handleReady(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}

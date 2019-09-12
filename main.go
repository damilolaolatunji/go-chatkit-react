package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/pusher/chatkit-server-go"
	"github.com/rs/cors"
)

func init() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
}

type User struct {
	ID string `json:"username"`
}

type Auth struct {
	AccessToken string  `json:"access_token"`
	ExpiresIn   float64 `json:"expires_in"`
	TokenType   string  `json:"bearer"`
}

func main() {
	chatkitInstanceLocator := os.Getenv("CHATKIT_INSTANCE_LOCATOR")
	chatkitSecretKey := os.Getenv("CHATKIT_SECRET_KEY")
	ctx := context.TODO()

	client, err := chatkit.NewClient(chatkitInstanceLocator, chatkitSecretKey)
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
		user := &User{}

		defer r.Body.Close()

		err := json.NewDecoder(r.Body).Decode(user)
		if err != nil {
			if err != io.EOF {
				log.Fatal(err)
			}
		}

		opts := chatkit.CreateUserOptions{
			ID:   user.ID,
			Name: user.ID,
		}

		err = client.CreateUser(ctx, opts)
		if err != nil {
			if strings.Contains(err.Error(), "services/chatkit/user_already_exists") {
				fmt.Printf("User already exists: %s", user.ID)
			} else {
				log.Fatal(err)
			}
		}
	})

	mux.HandleFunc("/authenticate", func(w http.ResponseWriter, r *http.Request) {
		u, err := url.Parse(r.URL.String())
		if err != nil {
			log.Fatal(err)
		}

		values := u.Query()
		userID := values.Get("user_id")

		opts := chatkit.AuthenticateOptions{
			UserID: &userID,
		}

		auth, err := client.GenerateAccessToken(opts)
		if err != nil {
			log.Fatal(err)
		}

		resp := &Auth{
			AccessToken: auth.Token,
			ExpiresIn:   auth.ExpiresIn,
			TokenType:   "bearer",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resp)
	})

	handler := cors.Default().Handler(mux)

	log.Fatal(http.ListenAndServe(":5200", handler))
}

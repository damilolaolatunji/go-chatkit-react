import React, { Component } from "react";
import { ChatManager, TokenProvider } from "@pusher/chatkit-client";
import axios from 'axios';

import "skeleton-css/css/normalize.css";
import "skeleton-css/css/skeleton.css";
import "./App.css";

class App extends Component {
  constructor() {
    super();
    this.state = {
      userId: "",
      currentUser: null,
      currentRoom: null,
      rooms: [],
      messages: [],
      newMessage: "",
    };
  }

  handleInput = (event) => {
    const { value, name } = event.target;

    this.setState({
      [name]: value
    });
  }

  connectToChatkit = (event) => {
    event.preventDefault();
    const { userId } = this.state;

    axios
      .post('http://localhost:5200/users', { username: userId })
      .then(() => {
        const tokenProvider = new TokenProvider({
          url:
          "http://localhost:5200/authenticate"
        });

        const chatManager = new ChatManager({
          instanceLocator: "v1:us1:767f9cbc-ed46-405f-9ac8-8a248e533960",
          userId,
          tokenProvider
        });

        return chatManager
          .connect()
          .then(currentUser => {
            this.setState(
              {
                currentUser,
              },
              () => this.connectToRoom()
            );
          })
      })
      .catch(console.error);
  }

  connectToRoom = (roomId = "eeec9d87-5d32-453c-8b7d-a8b51dcc9a0d") => {
    const { currentUser } = this.state;
    this.setState({
      messages: []
    });

    return currentUser
      .subscribeToRoomMultipart({
        roomId,
        messageLimit: 10,
        hooks: {
          onMessage: message => {
            this.setState({
              messages: [...this.state.messages, message],
            });
          },
        }
      })
      .then(currentRoom => {
        this.setState({
          currentRoom,
          rooms: currentUser.rooms,
        });
      })
      .catch(console.error);
  }

  sendMessage = (event) => {
    event.preventDefault();
    const { newMessage, currentUser, currentRoom } = this.state;
    const parts = [];

    if (newMessage.trim() === "") return;

    parts.push({
      type: "text/plain",
      content: newMessage
    });

    currentUser.sendMultipartMessage({
      roomId: `${currentRoom.id}`,
      parts
    });

    this.setState({
      newMessage: "",
    });
  }

  render() {
    const {
      rooms,
      currentRoom,
      currentUser,
      messages,
      newMessage,
    } = this.state;

    const roomList = rooms.map(room => {
      const isRoomActive = room.id === currentRoom.id ? 'active' : '';
      return (
        <li
          className={isRoomActive}
          key={room.id}
          onClick={() => this.connectToRoom(room.id)}
        >
          <span className="room-name">{room.name}</span>
        </li>
      );
    });

    const messageList = messages.map(message => {
      const arr = message.parts.map(p => {
        let text = p.payload.content;
        return (
          <span class="message-text">{text}</span>
        );
      });

      return (
        <li className="message" key={message.id}>
          <div>
            <span className="user-id">{message.senderId}</span>
            {arr}
          </div>
        </li>
      )
    });

    return (
      <div className="App">
        <aside className="sidebar left-sidebar">
          {!currentUser ? (
              <div className="login">
                <h3>Join Chat</h3>
                <form id="login" onSubmit={this.connectToChatkit}>
                  <input
                    onChange={this.handleInput}
                    className="userId"
                    type="text"
                    name="userId"
                    placeholder="Enter your username"
                  />
                </form>
              </div>
            ) : null
          }
          {currentRoom ? (
            <div className="room-list">
              <h3>Rooms</h3>
              <ul className="chat-rooms">
                {roomList}
              </ul>
            </div>
            ) : null
          }
        </aside>
        {
          currentUser ? (
            <section className="chat-screen">
              <ul className="chat-messages">
                {messageList}
              </ul>
              <footer className="chat-footer">
                <form onSubmit={this.sendMessage} className="message-form">
                  <input
                    type="text"
                    value={newMessage}
                    name="newMessage"
                    className="message-input"
                    placeholder="Type your message and hit ENTER to send"
                    onChange={this.handleInput}
                  />
                </form>
              </footer>
            </section>
          ) : null
        }
      </div>
    );
  }
}

export default App;

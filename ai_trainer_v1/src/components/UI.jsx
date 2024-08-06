import { useRef, useEffect, useState } from "react";
import { useChat } from "../hooks/useChat";

export const UI = ({ hidden, ...props }) => {
  const input = useRef();
  const chatHistoryRef = useRef(null);
  const [responses, setResponses] = useState([]);
  const { chat,  interactionLoading, cameraZoomed, setCameraZoomed, message, messages, showPopUp, handleStartNewChat, incorrectAttempts } = useChat();
  

  const sendMessage = () => {
    const text = input.current.value;
    if (! interactionLoading && !message) {
      chat(text);
      input.current.value = "";
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setResponses(messages);
    }
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollBottom = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  if (hidden) {
    return null;
  }

  return (
    <>
    {showPopUp && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <p className="text-lg mb-4">
              {incorrectAttempts >= 3
                ? "You have exceeded the maximum number of incorrect attempts."
                : "Correct! Would you like to start a new chat?"}
            </p>
            <button
              onClick={handleStartNewChat}
              className="bg-gray-500 hover:bg-yellow-600 text-white p-4 rounded-md"
            >
              Start New Chat
            </button>
          </div>
        </div>
      )}
      <div className={`fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-4 flex-col pointer-events-none ${showPopUp ? "opacity-50" : ""}`}>
        <div className="self-start backdrop-blur-md bg-white bg-opacity-50 p-4 rounded-lg">
          <h1 className="font-black text-xl">Virtual Customer Experience</h1>
          <p>Construction and Forestry</p>
        </div>
        <div className="w-full flex flex-col items-end justify-center gap-4">
          <button
            onClick={() => setCameraZoomed(!cameraZoomed)}
            className="pointer-events-auto bg-gray-500 hover:bg-yellow-600 text-white p-4 rounded-md"
          >
            {cameraZoomed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              const body = document.querySelector("body");
              if (body.classList.contains("greenScreen")) {
                body.classList.remove("greenScreen");
              } else {
                body.classList.add("greenScreen");
              }
            }}
            className="pointer-events-auto bg-gray-500 hover:bg-yellow-600 text-white p-4 rounded-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </button>
        </div>
        <div ref={chatHistoryRef} className="chat-history pointer-events-auto max-w-screen-sm w-full mx-auto mt-4 bg-white bg-opacity-50 backdrop-blur-md p-4 rounded-md overflow-y-auto flex-grow" style={{ height: "300px"}}>
        {responses.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <strong>{message.role === "user" ? "You" : "Customer"}:</strong> {message.content}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pointer-events-auto max-w-screen-sm w-full mx-auto">
          <input
            className="w-full placeholder:text-gray-800 placeholder:italic p-4 rounded-md bg-opacity-50 bg-white backdrop-blur-md"
            placeholder="Type a message..."
            ref={input}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
            disabled={showPopUp}
          />
          <button
            disabled={ interactionLoading || message}
            onClick={sendMessage}
            className={`bg-gray-500 hover:bg-yellow-600 text-white p-4 px-10 font-semibold uppercase rounded-md ${
               interactionLoading || message ? "cursor-not-allowed opacity-30" : ""
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
};

// src/context/ChatContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ChatContext = createContext();
const getSessionId = () => {
  let sessionId = localStorage.getItem("session_id");
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem("session_id", sessionId);
  }
  return sessionId;
};

const isClarifyingQuestion = (query) => {
  const clarifyingKeywords = [
    "more info",
    "clarify",
    "explain",
    "details",
    "information",
    "what do you mean",
    "can you elaborate",
    "could you elaborate",
    "tell me more",
    "please explain",
    "located",
    "machine",
    "looking for",
    "serial",
    "specific",
    "specificaly",
    "multiple",
  ];

  return clarifyingKeywords.some((keyword) =>
    query.toLowerCase().includes(keyword)
  );
};

export const ChatProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(getSessionId);
  const [messages, setMessages] = useState([]);
  const [modelLoading, setModelLoading] = useState(true); // Loading state for models
  const [interactionLoading, setInteractionLoading] = useState(false); // Loading state for AI interaction
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [showPopUp, setShowPopUp] = useState(false);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [animationUrl, setAnimationUrl] = useState(null);

  const chat = async (query) => {
    // Function to get the CSRF token
    function getCookie(name) {
      let cookieValue = null;
      if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          // Does this cookie string begin with the name we want?
          if (cookie.substring(0, name.length + 1) === name + "=") {
            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            break;
          }
        }
      }
      return cookieValue;
    }

    // Get the CSRF token
    const csrftoken = getCookie("csrftoken");
    setInteractionLoading(true);
    try {
      const response = await fetch(
        `https://${backendUrl}/api/interact-with-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken
          },
          body: JSON.stringify({
            query,
            session_id: sessionId,
            incorrect_attempts: incorrectAttempts,
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      const partNumberCorrect = data.part_number_correct;
      if (partNumberCorrect) {
        setShowPopUp(true);
      } else if (!isClarifyingQuestion(query)) {
        setIncorrectAttempts((prev) => prev + 1);
        if (incorrectAttempts + 1 >= 3) {
          setShowPopUp(true);
        }
      }

      setMessages((messages) => [
        ...messages,
        { id: uuidv4(), role: "user", content: query },
        { id: uuidv4(), role: "assistant", content: data.response, ...data },
      ]);
    } catch (error) {
      console.error("Error interacting with AI:", error);
    } finally {
      setInteractionLoading(false);
    }
  };

  const fetchSignedUrls = async () => {
    setModelLoading(true); // Set model loading to true when fetching URLs
    try {
      const avatarResponse = await fetch(
        `https://${backendUrl}/api/avatar_presigned_url`
      );
      const avatarData = await avatarResponse.json();
      setAvatarUrl(avatarData.url);

      const animationResponse = await fetch(
        `https://${backendUrl}/api/animation_presigned_url`
      );
      const animationData = await animationResponse.json();
      setAnimationUrl(animationData.url);
    } catch (error) {
      console.error("Error fetching signed URLs:", error);
    } finally {
      setModelLoading(false); // Set model loading to false when done
    }
  };

  const handleStartNewChat = () => {
    const newSessionId = uuidv4();
    localStorage.setItem("session_id", newSessionId);
    setSessionId(newSessionId);
    setMessages([]);
    setIncorrectAttempts(0);
    setShowPopUp(false);
  };

  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  useEffect(() => {}, [messages]);

  useEffect(() => {
    fetchSignedUrls();
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chat,
        onMessagePlayed,
        modelLoading,
        interactionLoading,
        cameraZoomed,
        setCameraZoomed,
        messages,
        showPopUp,
        handleStartNewChat,
        incorrectAttempts,
        currentAudio,
        setCurrentAudio,
        audioPlaying,
        setAudioPlaying,
        avatarUrl,
        animationUrl,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

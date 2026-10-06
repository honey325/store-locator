import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { io } from 'socket.io-client';

const Chat = () => {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, otherTyping]);

  useEffect(() => {
    // 1. Fetch historical messages
    const fetchHistory = async () => {
      try {
        const res = await axiosInstance.get(`/chat/conversations/${conversationId}/messages`);
        setMessages(res.data.messages);
        setConversation(res.data.conversation);
      } catch (err) {
        console.error(err);
        alert('Failed to load conversation');
        navigate('/');
      }
    };
    
    fetchHistory();

    // 2. Initialize Socket
    const token = localStorage.getItem('token');
    const newSocket = io(import.meta.env.VITE_API_URL.replace('/api', ''), {
      auth: { token },
      transports: ['websocket'],
    });

    setSocket(newSocket);

    // 3. Socket event listeners
    newSocket.on('connect', () => {
      newSocket.emit('join_conversation', { conversationId });
    });

    newSocket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    newSocket.on('user_typing', (data) => {
      if (data.userId !== user?.id) setOtherTyping(true);
    });

    newSocket.on('user_stopped_typing', (data) => {
      if (data.userId !== user?.id) setOtherTyping(false);
    });

    newSocket.on('error', (err) => {
      console.error('Socket Error:', err);
    });

    // Cleanup
    return () => {
      newSocket.emit('leave_conversation', { conversationId });
      newSocket.disconnect();
    };
  }, [conversationId, navigate, user?.id]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;
    
    socket.emit('send_message', { conversationId, message: inputText });
    setInputText('');
    handleStopTyping();
  };

  // Typing indicator logic
  let typingTimeout = null;
  const handleTyping = (e) => {
    setInputText(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('typing', { conversationId });
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(handleStopTyping, 2000);
  };

  const handleStopTyping = () => {
    setIsTyping(false);
    socket?.emit('stop_typing', { conversationId });
  };

  const getChatPartnerName = () => {
    if (!conversation) return 'Loading...';
    return user?.role?.roleName === 'customer' ? conversation.store.name : conversation.customer.name;
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatWindow}>
        
        {/* Header */}
        <div style={styles.header}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>&larr; Back</button>
          <h2 style={styles.headerTitle}>{getChatPartnerName()}</h2>
        </div>

        {/* Messages */}
        <div style={styles.messagesContainer}>
          {messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div key={msg.id} style={isMe ? styles.messageRowMe : styles.messageRowThem}>
                <div style={isMe ? styles.messageBubbleMe : styles.messageBubbleThem}>
                  <p style={styles.messageText}>{msg.message}</p>
                  <span style={styles.messageTime}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          
          {otherTyping && (
            <div style={styles.messageRowThem}>
              <div style={{...styles.messageBubbleThem, fontStyle: 'italic', color: '#6b7280'}}>
                Typing...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} style={styles.inputForm}>
          <input
            type="text"
            value={inputText}
            onChange={handleTyping}
            placeholder="Type a message..."
            style={styles.input}
          />
          <button type="submit" style={styles.sendBtn} disabled={!inputText.trim()}>
            Send
          </button>
        </form>

      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    height: 'calc(100vh - 64px)',
    backgroundColor: '#f3f4f6',
    padding: '1rem',
  },
  chatWindow: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '1rem',
    backgroundColor: '#1f2937',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.25rem',
  },
  messagesContainer: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    backgroundColor: '#f9fafb',
  },
  messageRowMe: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  messageBubbleMe: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1rem',
    borderRadius: '16px 16px 0 16px',
    maxWidth: '70%',
  },
  messageBubbleThem: {
    backgroundColor: '#e5e7eb',
    color: '#111827',
    padding: '0.75rem 1rem',
    borderRadius: '16px 16px 16px 0',
    maxWidth: '70%',
  },
  messageText: {
    margin: 0,
  },
  messageTime: {
    fontSize: '0.7rem',
    opacity: 0.8,
    display: 'block',
    textAlign: 'right',
    marginTop: '4px',
  },
  inputForm: {
    display: 'flex',
    padding: '1rem',
    borderTop: '1px solid #e5e7eb',
    gap: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '24px',
    outline: 'none',
  },
  sendBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    cursor: 'pointer',
    fontWeight: 'bold',
  }
};

export default Chat;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const Conversations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axiosInstance.get('/chat/conversations');
        setConversations(res.data.conversations || []);
      } catch (err) {
        console.error(err);
        alert('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  if (loading) return <div style={styles.container}>Loading conversations...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Your Chats</h2>
      
      {conversations.length === 0 ? (
        <p>No conversations found.</p>
      ) : (
        <div style={styles.list}>
          {conversations.map((conv) => {
            const isOwner = user?.role?.roleName === 'owner';
            const partnerName = isOwner ? conv.customer?.name : conv.store?.name;
            const lastMessage = conv.messages?.[0];
            const isUnread = lastMessage && !lastMessage.isRead && lastMessage.senderId !== user?.id;

            return (
              <div 
                key={conv.id} 
                style={{
                  ...styles.card, 
                  backgroundColor: isUnread ? '#eff6ff' : 'white',
                  borderLeft: isUnread ? '4px solid #3b82f6' : '1px solid #e5e7eb'
                }}
                onClick={() => navigate(`/chat/${conv.id}`)}
              >
                <div style={styles.cardHeader}>
                  <h3 style={styles.partnerName}>{partnerName}</h3>
                  {lastMessage && (
                    <span style={styles.time}>
                      {new Date(lastMessage.createdAt).toLocaleDateString()} {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                
                <div style={styles.messagePreview}>
                  {lastMessage ? (
                    <p style={{ margin: 0, fontWeight: isUnread ? 'bold' : 'normal', color: isUnread ? '#111827' : '#6b7280' }}>
                      {lastMessage.senderId === user?.id ? 'You: ' : ''}{lastMessage.message}
                    </p>
                  ) : (
                    <p style={{ margin: 0, color: '#9ca3af', fontStyle: 'italic' }}>No messages yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    marginBottom: '1.5rem',
    color: '#1f2937',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.1s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  partnerName: {
    margin: 0,
    fontSize: '1.125rem',
    color: '#111827',
  },
  time: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  messagePreview: {
    fontSize: '0.95rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }
};

export default Conversations;

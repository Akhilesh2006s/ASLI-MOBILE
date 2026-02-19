import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VidyaAIViewProps {
  userId?: string;
  context?: {
    studentName?: string;
    currentSubject?: string;
    currentTopic?: string;
  };
}

export default function VidyaAIView({ userId, context }: VidyaAIViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(userId || null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUserData(data.user);
          setAdminId(data.user._id || data.user.id);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !adminId) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: adminId,
          message: inputMessage,
          context: {
            studentName: userData?.schoolName || userData?.fullName || userData?.email?.split('@')[0] || 'Admin',
            currentSubject: context?.currentSubject || 'Administration',
            currentTopic: context?.currentTopic
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response || data.message || 'I apologize, but I could not generate a response.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorData = await response.json();
        const errorMessage: Message = {
          role: 'assistant',
          content: errorData.message || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Ionicons name="sparkles" size={48} color="#fb923c" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Vidya AI</Text>
            <Text style={styles.headerSubtitle}>AI Chat Assistant</Text>
          </View>
        </View>
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionTitle}>AI Chat Assistant</Text>
        <Text style={styles.descriptionText}>
          Get instant help with administrative questions, student management, and educational guidance
        </Text>
      </View>

      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        ref={(ref) => {
          if (ref && messages.length > 0) {
            setTimeout(() => ref.scrollToEnd({ animated: true }), 100);
          }
        }}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>Start a conversation with Vidya AI</Text>
            <Text style={styles.emptyStateSubtext}>
              Ask me about student management, class assignments, or any administrative questions
            </Text>
          </View>
        ) : (
          messages.map((message, index) => (
            <View
              key={index}
              style={[
                styles.messageContainer,
                message.role === 'user' ? styles.userMessage : styles.assistantMessage
              ]}
            >
              {message.role === 'assistant' && (
                <View style={styles.assistantAvatar}>
                  <Ionicons name="sparkles" size={20} color="#fb923c" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userMessageText : styles.assistantMessageText
                  ]}
                >
                  {message.content}
                </Text>
              </View>
              {message.role === 'user' && (
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={20} color="#fff" />
                </View>
              )}
            </View>
          ))
        )}
        {isLoading && (
          <View style={[styles.messageContainer, styles.assistantMessage]}>
            <View style={styles.assistantAvatar}>
              <Ionicons name="sparkles" size={20} color="#fb923c" />
            </View>
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <ActivityIndicator size="small" color="#fb923c" />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder="Type your message..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputMessage.trim() || isLoading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    minHeight: 0,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  descriptionContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#fb923c',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#111827',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fb923c',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
    backgroundColor: '#f9fafb',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fb923c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.5,
  },
});

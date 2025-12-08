import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

export default function VidyaAIView() {
  const [messages, setMessages] = useState<any[]>([{
    role: 'assistant',
    content: 'Hello! I\'m Vidya AI. How can I help you today?',
    timestamp: new Date(),
  }]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    const userMsg = { role: 'user', content: inputText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/ai-chat`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          userId: 'super-admin',
          message: currentInput, 
          context: {
            studentName: 'Super Admin',
            currentSubject: 'General'
          }
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Handle response similar to web version
        if (result.session?.messages) {
          // Use session messages which includes both user and AI messages
          setMessages(result.session.messages);
        } else if (result.message) {
          // Fallback: add AI message if session messages not available
          setMessages(prev => {
            // Avoid duplicates - check if this message already exists
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === 'assistant' && lastMessage.content === result.message) {
              return prev;
            }
            return [...prev, { 
              role: 'assistant', 
              content: result.message, 
              timestamp: new Date() 
            }];
          });
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: result.response || 'I apologize, but I couldn\'t process that request.', 
            timestamp: new Date() 
          }]);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Sorry, I encountered an error (${response.status}). Please try again.`, 
          timestamp: new Date() 
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered a network error. Please check your connection and try again.', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollViewRef} style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.map((msg, idx) => (
          <View key={idx} style={[styles.message, msg.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
            <Text style={msg.role === 'user' ? styles.userMessageText : styles.messageText}>
              {msg.content}
            </Text>
          </View>
        ))}
        {isLoading && (
          <View style={[styles.message, styles.assistantMessage]}>
            <Text style={styles.messageText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask Vidya AI..."
          multiline
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={isLoading || !inputText.trim()}>
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  messages: { flex: 1 },
  messagesContent: { padding: 16 },
  message: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 12 },
  userMessage: { alignSelf: 'flex-end', backgroundColor: '#f97316' },
  assistantMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  messageText: { fontSize: 16, color: '#111827' },
  userMessageText: { fontSize: 16, color: '#fff' },
  inputContainer: { flexDirection: 'row', padding: 16, paddingBottom: 32, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, maxHeight: 100, fontSize: 16 },
  sendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f97316', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});


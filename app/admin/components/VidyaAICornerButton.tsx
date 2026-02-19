import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface VidyaAICornerButtonProps {
  onPress?: () => void;
}

const messages = [
  "Need help managing your school?",
  "Ask me about student management",
  "Need help with class assignments?",
  "Ask me about teacher management?"
];

export default function VidyaAICornerButton({ onPress }: VidyaAICornerButtonProps) {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <View style={styles.container}>
      {/* Message Popup */}
      <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
        <View style={styles.messageBubble}>
          <Text style={styles.messageText}>{messages[currentMessage]}</Text>
          {/* Speech bubble tail */}
          <View style={styles.messageTail} />
        </View>
      </Animated.View>

      {/* Vidya AI Image/Button */}
      <TouchableOpacity
        style={styles.imageButton}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          <Ionicons name="bulb" size={32} color="#fb923c" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    zIndex: 50,
    alignItems: 'flex-start',
  },
  messageContainer: {
    marginBottom: 8,
  },
  messageBubble: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#fed7aa',
    position: 'relative',
    maxWidth: 200,
  },
  messageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  messageTail: {
    position: 'absolute',
    bottom: -8,
    left: 32,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fed7aa',
  },
  imageButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fb923c',
  },
});

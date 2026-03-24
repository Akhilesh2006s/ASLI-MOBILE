import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface DigitalLibraryModuleProps {
  onPressLibrary: () => void;
}

function DigitalLibraryModuleComponent({ onPressLibrary }: DigitalLibraryModuleProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const cardWidth = compact ? '48.2%' : '31.6%';

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Digital Library</Text>
      <Text style={styles.sectionSub}>Browse by Type</Text>
      <View style={styles.grid}>
        {[
          { title: 'TextBook', icon: 'book-outline' as const },
          { title: 'Workbook', icon: 'document-text-outline' as const },
          { title: 'Material', icon: 'document-outline' as const },
          { title: 'Video', icon: 'videocam-outline' as const },
          { title: 'Audio', icon: 'headset-outline' as const },
          { title: 'Homework', icon: 'clipboard-outline' as const },
        ].map((item) => (
          <TouchableOpacity
            key={item.title}
            style={[styles.card, { width: cardWidth }]}
            onPress={onPressLibrary}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#60a5fa', '#8b5cf6']} style={styles.iconWrap}>
              <Ionicons name={item.icon} size={16} color="#fff" />
            </LinearGradient>
            <Text style={styles.cardText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  sectionSub: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
});

export default memo(DigitalLibraryModuleComponent);

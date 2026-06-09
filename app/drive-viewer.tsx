import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../src/lib/api-config';
import { useContentViewerBack } from '../src/hooks/useBackNavigation';
import MediaPreviewPanel from '../src/components/shared/MediaPreviewPanel';
import { resolveContentUrl } from '../src/utils/contentPreview';

interface DriveFile {
  _id: string;
  title: string;
  description?: string;
  driveLink: string;
  fileType?: string;
  subject?: {
    _id: string;
    name: string;
  } | string;
  createdAt: string;
}

function pickParam(v: string | string[] | undefined): string {
  if (v == null) return '';
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' ? s : '';
}

export default function DriveViewer() {
  const params = useLocalSearchParams<{
    fileId?: string;
    driveLink?: string;
    title?: string;
    contentType?: string;
    returnTo?: string | string[];
  }>();
  const fileId = pickParam(params.fileId);
  const returnTo = pickParam(params.returnTo);
  const driveLinkRaw = pickParam(params.driveLink);
  const paramTitle = pickParam(params.title);
  const contentType = pickParam(params.contentType);
  const driveLink = (() => {
    if (!driveLinkRaw) return '';
    try {
      return decodeURIComponent(driveLinkRaw);
    } catch {
      return driveLinkRaw;
    }
  })();

  const [file, setFile] = useState<DriveFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const goBack = useContentViewerBack(returnTo || undefined);

  const previewUrl = resolveContentUrl(file?.driveLink || driveLink);
  const previewTitle = file?.title || paramTitle || 'Preview';

  const fetchFile = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/drive-files/${fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fileData = data.data || data;
        setFile(fileData);
      } else {
        Alert.alert('Error', 'Failed to load file');
      }
    } catch (error) {
      console.error('Error fetching file:', error);
      Alert.alert('Error', 'An error occurred while loading the file');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (driveLink) {
      setIsLoading(false);
    } else if (fileId) {
      fetchFile();
    } else {
      setIsLoading(false);
    }
  }, [fileId, driveLink]);

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading preview…</Text>
        </View>
      );
    }

    if (!previewUrl) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>File not found</Text>
        </View>
      );
    }

    return (
      <MediaPreviewPanel
        fileUrl={previewUrl}
        title={previewTitle}
        contentType={contentType || file?.fileType}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => void goBack()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {previewTitle}
            </Text>
            {file?.description ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {file.description}
              </Text>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.previewContainer}>{renderBody()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    zIndex: 20,
    elevation: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBack: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

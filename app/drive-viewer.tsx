import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
// Using Linking instead of WebView for better compatibility
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';

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
  const params = useLocalSearchParams<{ fileId?: string; driveLink?: string }>();
  const fileId = pickParam(params.fileId);
  const driveLinkRaw = pickParam(params.driveLink);
  /** Decode once — Learning Paths passes encodeURIComponent so `&` in URLs doesn't break routing */
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
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');

  const convertToViewerUrl = (link: string): string => {
    let extractedId = '';

    const fileMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      extractedId = fileMatch[1];
    } else {
      const openMatch = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (openMatch) {
        extractedId = openMatch[1];
      } else {
        const docMatch = link.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
        if (docMatch) {
          extractedId = docMatch[1];
        } else {
          const sheetMatch = link.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
          if (sheetMatch) {
            extractedId = sheetMatch[1];
          } else {
            const slideMatch = link.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
            if (slideMatch) {
              extractedId = slideMatch[1];
            }
          }
        }
      }
    }

    if (!extractedId) {
      return link;
    }

    if (link.includes('document')) {
      return `https://docs.google.com/document/d/${extractedId}/preview`;
    }
    if (link.includes('spreadsheet')) {
      return `https://docs.google.com/spreadsheets/d/${extractedId}/preview`;
    }
    if (link.includes('presentation')) {
      return `https://docs.google.com/presentation/d/${extractedId}/preview`;
    }
    return `https://drive.google.com/file/d/${extractedId}/preview`;
  };

  const fetchFile = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/drive-files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const fileData = data.data || data;
        setFile(fileData);
        setViewerUrl(convertToViewerUrl(fileData.driveLink));
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
      setViewerUrl(convertToViewerUrl(driveLink));
      setIsLoading(false);
    } else if (fileId) {
      fetchFile();
    } else {
      setIsLoading(false);
    }
    getDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
  }, [fileId, driveLink]);

  useBackNavigation(dashboardPath, false);

  const handleOpenInBrowser = () => {
    const url = file?.driveLink || driveLink || '';
    if (url) {
      Linking.openURL(url).catch(err => {
        Alert.alert('Error', 'Could not open link in browser');
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading file...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!viewerUrl) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>File not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace(dashboardPath)}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.replace(dashboardPath)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {file?.title || 'Drive File'}
            </Text>
            {file?.description && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {file.description}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={handleOpenInBrowser} style={styles.openButton}>
            <Ionicons name="open-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Document Preview */}
      <View style={styles.previewContainer}>
        <View style={styles.previewContent}>
          <Ionicons name="document-text" size={64} color="#3b82f6" />
          <Text style={styles.previewTitle}>{file?.title || 'Drive File'}</Text>
          <Text style={styles.previewText}>
            This file will open in your browser for the best viewing experience.
          </Text>
          <TouchableOpacity
            style={styles.openButtonLarge}
            onPress={handleOpenInBrowser}
          >
            <Ionicons name="open-outline" size={24} color="#fff" />
            <Text style={styles.openButtonText}>Open in Browser</Text>
          </TouchableOpacity>
          {file?.description && (
            <Text style={styles.previewDescription}>{file.description}</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  openButton: {
    padding: 4,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  previewContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  previewText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  openButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  previewDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16,
  },
});


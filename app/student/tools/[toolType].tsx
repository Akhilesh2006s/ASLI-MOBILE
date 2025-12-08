import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { useBackNavigation, getDashboardPath } from '../../../src/hooks/useBackNavigation';

interface ToolConfig {
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'number';
    placeholder?: string;
    options?: string[];
    required?: boolean;
    dependsOn?: string;
    getOptions?: (value: string) => string[];
  }>;
}

// Class-wise subjects mapping
const CLASS_SUBJECTS: Record<string, string[]> = {
  'Class 6': ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science', 'Physical Education', 'Art', 'Music'],
  'Class 7': ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science', 'Physical Education', 'Art', 'Music'],
  'Class 8': ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science', 'Physical Education', 'Art', 'Music'],
  'Class 9': ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Social Studies', 'History', 'Geography', 'Civics', 'Economics', 'Computer Science', 'Physical Education', 'Art', 'Music'],
  'Class 10': ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Social Studies', 'History', 'Geography', 'Civics', 'Economics', 'Computer Science', 'Physical Education', 'Art', 'Music'],
  'Class 11': ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Computer Science', 'Physical Education', 'Economics', 'Business Studies', 'Accountancy', 'History', 'Geography', 'Political Science', 'Psychology', 'Sociology', 'Philosophy', 'Fine Arts', 'Music'],
  'Class 12': ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Computer Science', 'Physical Education', 'Economics', 'Business Studies', 'Accountancy', 'History', 'Geography', 'Political Science', 'Psychology', 'Sociology', 'Philosophy', 'Fine Arts', 'Music'],
  'Dropper Batch': ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English']
};

const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Dropper Batch'];

const TOOL_CONFIGS: Record<string, ToolConfig> = {
  'smart-study-guide-generator': {
    name: 'Smart Study Guide Generator',
    description: 'Create personalized study guides tailored to your needs',
    icon: 'bookmark',
    color: '#fb923c',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'focusAreas', label: 'Focus Areas (Optional)', type: 'textarea', placeholder: 'e.g., formulas, concepts, practice problems' }
    ]
  },
  'concept-breakdown-explainer': {
    name: 'Concept Breakdown Explainer',
    description: 'Break down complex concepts into simple explanations',
    icon: 'bulb',
    color: '#3b82f6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'concept', label: 'Concept *', type: 'text', required: true, placeholder: 'Enter concept name' }
    ]
  },
  'personalized-revision-planner': {
    name: 'Personalized Revision Planner',
    description: 'Get a customized revision schedule based on your goals',
    icon: 'calendar',
    color: '#14b8a6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subjects', label: 'Subjects *', type: 'text', required: true, placeholder: 'e.g., Mathematics, Physics, Chemistry' },
      { name: 'examDate', label: 'Exam Date (Optional)', type: 'text', placeholder: 'e.g., 2025-03-15' },
      { name: 'studyHoursPerDay', label: 'Study Hours Per Day', type: 'number', placeholder: '4' }
    ]
  },
  'smart-qa-practice-generator': {
    name: 'Smart Q&A Practice Generator',
    description: 'Generate practice questions with detailed answers',
    icon: 'help-circle',
    color: '#fb923c',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'questionCount', label: 'Number of Questions', type: 'number', placeholder: '10' },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'medium', 'hard'] }
    ]
  },
  'chapter-summary-creator': {
    name: 'Chapter Summary Creator',
    description: 'Create concise summaries of chapters and topics',
    icon: 'document-text',
    color: '#3b82f6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'chapter', label: 'Chapter/Topic *', type: 'text', required: true, placeholder: 'Enter chapter or topic name' }
    ]
  },
  'key-points-formula-extractor': {
    name: 'Key Points & Formula Extractor',
    description: 'Extract key points and formulas from any topic',
    icon: 'key',
    color: '#14b8a6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' }
    ]
  },
  'quick-assignment-builder': {
    name: 'Quick Assignment Builder',
    description: 'Build structured assignments quickly and efficiently',
    icon: 'clipboard',
    color: '#fb923c',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'assignmentType', label: 'Assignment Type', type: 'select', options: ['Homework', 'Project', 'Research', 'Practice'] }
    ]
  },
  'exam-readiness-checker': {
    name: 'Exam Readiness Checker',
    description: 'Assess your readiness for upcoming exams',
    icon: 'checkmark-circle',
    color: '#3b82f6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'examType', label: 'Exam Type', type: 'select', options: ['Unit Test', 'Mid-Term', 'Final Exam', 'Board Exam', 'Competitive Exam'] },
      { name: 'examDate', label: 'Exam Date (Optional)', type: 'text', placeholder: 'e.g., 2025-03-15' }
    ]
  },
  'project-layout-designer': {
    name: 'Project Layout Designer',
    description: 'Design structured layouts for your projects',
    icon: 'grid',
    color: '#14b8a6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'projectTopic', label: 'Project Topic *', type: 'text', required: true, placeholder: 'Enter project topic' },
      { name: 'projectType', label: 'Project Type', type: 'select', options: ['Research', 'Science Experiment', 'Model', 'Presentation', 'Report'] }
    ]
  },
  'goal-motivation-planner': {
    name: 'Goal & Motivation Planner',
    description: 'Set goals and create motivation plans for success',
    icon: 'target',
    color: '#fb923c',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'goalType', label: 'Goal Type', type: 'select', options: ['Academic', 'Exam Preparation', 'Skill Development', 'Overall Improvement'] },
      { name: 'timeframe', label: 'Timeframe', type: 'select', options: ['1 week', '1 month', '3 months', '6 months', '1 year'] },
      { name: 'description', label: 'Goal Description (Optional)', type: 'textarea', placeholder: 'Describe your specific goals...' }
    ]
  },
};

export default function StudentToolPage() {
  const { toolType } = useLocalSearchParams<{ toolType: string }>();
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');

  const config = toolType ? TOOL_CONFIGS[toolType] : null;

  useEffect(() => {
    fetchUser();
    // Get dashboard path for back navigation
    getDashboardPath().then(path => {
      if (path) setDashboardPath(path);
    });
  }, []);

  // Navigate back to dashboard when back button is pressed
  useBackNavigation(dashboardPath, false);

  const fetchUser = async () => {
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
        const userData = await response.json();
        setUser(userData.user);
        
        // Auto-populate class field with student's assigned class
        if (userData.user) {
          const studentClass = userData.user.assignedClass?.classNumber || userData.user.classNumber;
          if (studentClass) {
            let classValue = studentClass.toString().trim();
            classValue = classValue.replace(/^Class\s*/i, '');
            const classNumber = parseInt(classValue.replace(/[^0-9]/g, ''));
            
            if (classNumber >= 6 && classNumber <= 12) {
              const formattedClass = `Class ${classNumber}`;
              if (CLASS_OPTIONS.includes(formattedClass)) {
                setFormParams(prev => ({ ...prev, gradeLevel: formattedClass }));
              }
            } else if (classValue.toLowerCase().includes('dropper')) {
              setFormParams(prev => ({ ...prev, gradeLevel: 'Dropper Batch' }));
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const handleInputChange = (fieldName: string, value: any) => {
    setFormParams(prev => {
      const updated = { ...prev, [fieldName]: value };
      
      if (fieldName === 'gradeLevel') {
        Object.keys(updated).forEach(key => {
          const field = config?.fields.find(f => f.name === key);
          if (field?.dependsOn === 'gradeLevel') {
            delete updated[key];
          }
        });
      }
      
      return updated;
    });
  };

  const getFieldOptions = (field: ToolConfig['fields'][0]): string[] => {
    if (field.options) {
      return field.options;
    }
    
    if (field.dependsOn && field.getOptions) {
      const dependencyValue = formParams[field.dependsOn];
      if (dependencyValue) {
        return field.getOptions(dependencyValue);
      }
      return [];
    }
    
    return [];
  };

  const handleGenerate = async () => {
    const requiredFields = config?.fields.filter(f => f.required) || [];
    const missingFields = requiredFields.filter(f => !formParams[f.name]);
    
    if (missingFields.length > 0) {
      Alert.alert('Validation Error', `Please fill in: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const token = await SecureStore.getItemAsync('authToken');
      
      const response = await fetch(`${API_BASE_URL}/api/student/ai/tool`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toolType,
          ...formParams
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGeneratedContent(data.data?.content || data.content || 'No content generated.');
        } else {
          throw new Error(data.message || 'Failed to generate content');
        }
      } else {
        const errorText = await response.text();
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      Alert.alert('Error', error.message || 'Network error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      Alert.alert('Copied', 'Content copied to clipboard!');
    } catch (error) {
      console.error('Copy error:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: generatedContent,
        title: config?.name
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (!config) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Tool not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderField = (field: ToolConfig['fields'][0]) => {
    const value = formParams[field.name] || '';

    if (field.type === 'textarea') {
      return (
        <View key={field.name} style={styles.fieldContainer}>
          <Text style={styles.label}>
            {field.label} {field.required && <Text style={styles.required}>*</Text>}
          </Text>
          <TextInput
            style={[styles.textArea, styles.input]}
            placeholder={field.placeholder}
            value={value}
            onChangeText={(text) => handleInputChange(field.name, text)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#9ca3af"
          />
        </View>
      );
    }

    if (field.type === 'select') {
      const options = getFieldOptions(field);
      
      return (
        <View key={field.name} style={styles.fieldContainer}>
          <Text style={styles.label}>
            {field.label} {field.required && <Text style={styles.required}>*</Text>}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectContainer}>
            {options.length > 0 ? (
              options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.selectOption, value === option && styles.selectOptionActive]}
                  onPress={() => handleInputChange(field.name, option)}
                >
                  <Text style={[styles.selectOptionText, value === option && styles.selectOptionTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noOptionsText}>
                {field.dependsOn ? 'Please select ' + config.fields.find(f => f.name === field.dependsOn)?.label.toLowerCase() : 'No options available'}
              </Text>
            )}
          </ScrollView>
        </View>
      );
    }

    return (
      <View key={field.name} style={styles.fieldContainer}>
        <Text style={styles.label}>
          {field.label} {field.required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={field.placeholder}
          value={value}
          onChangeText={(text) => handleInputChange(field.name, text)}
          keyboardType={field.type === 'number' ? 'numeric' : 'default'}
          placeholderTextColor="#9ca3af"
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[config.color, config.color + 'DD']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.backButtonHeader}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name={config.icon} size={32} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{config.name}</Text>
            <Text style={styles.headerSubtitle}>{config.description}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Form Fields */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Tool Parameters</Text>
          {config.fields.map(renderField)}
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
        >
          <LinearGradient
            colors={[config.color, config.color + 'DD']}
            style={styles.generateButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.generateButtonText}>Generate</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Generated Content */}
        {generatedContent && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Generated Content</Text>
              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCopy}
                >
                  <Ionicons name={copied ? "checkmark" : "copy"} size={20} color={config.color} />
                  <Text style={[styles.actionButtonText, { color: config.color }]}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                >
                  <Ionicons name="share" size={20} color={config.color} />
                  <Text style={[styles.actionButtonText, { color: config.color }]}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.resultContent}>
              <Text style={styles.resultText}>{generatedContent}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButtonHeader: {
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    minHeight: 100,
  },
  selectContainer: {
    flexDirection: 'row',
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  selectOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  selectOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectOptionTextActive: {
    color: '#fff',
  },
  noOptionsText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    padding: 12,
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resultSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultContent: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  resultText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});



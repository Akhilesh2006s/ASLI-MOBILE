import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';

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
    isStudentSelect?: boolean;
  }>;
}

// Class-wise subjects mapping
const CLASS_SUBJECTS: Record<string, string[]> = {
  'Class 6': [
    'Mathematics',
    'Science',
    'English',
    'Hindi',
    'Social Studies',
    'Computer Science',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Class 7': [
    'Mathematics',
    'Science',
    'English',
    'Hindi',
    'Social Studies',
    'Computer Science',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Class 8': [
    'Mathematics',
    'Science',
    'English',
    'Hindi',
    'Social Studies',
    'Computer Science',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Class 9': [
    'Mathematics',
    'Science',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'Hindi',
    'Social Studies',
    'History',
    'Geography',
    'Civics',
    'Economics',
    'Computer Science',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Class 10': [
    'Mathematics',
    'Science',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'Hindi',
    'Social Studies',
    'History',
    'Geography',
    'Civics',
    'Economics',
    'Computer Science',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Class 11': [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'Hindi',
    'Computer Science',
    'Physical Education',
    'Economics',
    'Business Studies',
    'Accountancy',
    'History',
    'Geography',
    'Political Science',
    'Psychology',
    'Sociology',
    'Philosophy',
    'Fine Arts',
    'Music'
  ],
  'Class 12': [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'Hindi',
    'Computer Science',
    'Physical Education',
    'Economics',
    'Business Studies',
    'Accountancy',
    'History',
    'Geography',
    'Political Science',
    'Psychology',
    'Sociology',
    'Philosophy',
    'Fine Arts',
    'Music'
  ],
  'Dropper Batch': [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English'
  ]
};

const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Dropper Batch'];

const TOOL_CONFIGS: Record<string, ToolConfig> = {
  'activity-project-generator': {
    name: 'Activity & Project Generator',
    description: 'Create engaging activities and projects tailored to your curriculum',
    icon: 'sparkles',
    color: '#f97316',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
      { name: 'className', label: 'Section (Optional)', type: 'text', placeholder: 'e.g., A, B, C' }
    ]
  },
  'worksheet-mcq-generator': {
    name: 'Worksheet & MCQ Generator',
    description: 'Design custom worksheets and MCQs with various question types',
    icon: 'document-text',
    color: '#8b5cf6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
      { name: 'questionType', label: 'Question Type *', type: 'select', required: true, options: ['Single Option', 'Multiple Option', 'Integer Type', 'All Types'], placeholder: 'Select question type' },
      { name: 'questionCount', label: 'Number of Questions', type: 'number', placeholder: '10' },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'medium', 'hard'] }
    ]
  },
  'concept-mastery-helper': {
    name: 'Concept Mastery Helper',
    description: 'Break down complex concepts into digestible lessons',
    icon: 'bulb',
    color: '#14b8a6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'concept', label: 'Topic/Concept *', type: 'text', required: true, placeholder: 'Enter concept or topic name' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' }
    ]
  },
  'lesson-planner': {
    name: 'Lesson Planner',
    description: 'Plan structured lessons with objectives and activities',
    icon: 'calendar',
    color: '#f97316',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
      { name: 'duration', label: 'Duration (minutes)', type: 'number', placeholder: '90' }
    ]
  },
  'homework-creator': {
    name: 'Homework Creator',
    description: 'Generate meaningful homework assignments',
    icon: 'rocket',
    color: '#f97316',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
      { name: 'duration', label: 'Expected Duration (minutes)', type: 'number', placeholder: '30' }
    ]
  },
  'rubrics-evaluation-generator': {
    name: 'Rubrics & Evaluation Generator',
    description: 'Create clear assessment criteria and rubrics',
    icon: 'scale',
    color: '#8b5cf6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'assignmentType', label: 'Assignment Type *', type: 'text', required: true, placeholder: 'e.g., Project, Essay, Lab Report' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' }
    ]
  },
  'learning-outcomes-generator': {
    name: 'Learning Outcomes Generator',
    description: 'Define measurable learning outcomes for your courses',
    icon: 'target',
    color: '#14b8a6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' }
    ]
  },
  'story-passage-creator': {
    name: 'Story & Passage Creator',
    description: 'Generate engaging stories and reading passages',
    icon: 'book',
    color: '#f97316',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
      { name: 'length', label: 'Length', type: 'select', options: ['short', 'medium', 'long'] }
    ]
  },
  'short-notes-summaries-maker': {
    name: 'Short Notes & Summaries Maker',
    description: 'Condense complex topics into concise notes',
    icon: 'layers',
    color: '#14b8a6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' }
    ]
  },
  'flashcard-generator': {
    name: 'Flashcard Generator',
    description: 'Build study flashcards for quick revision',
    icon: 'card',
    color: '#f97316',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
      { name: 'cardCount', label: 'Number of Cards', type: 'number', placeholder: '20' }
    ]
  },
  'report-card-generator': {
    name: 'Report Card Generator',
    description: 'Generate comprehensive student progress reports with feedback',
    icon: 'checkmark-circle',
    color: '#8b5cf6',
    fields: [
      { name: 'studentName', label: 'Student Name *', type: 'select', required: true, placeholder: 'Select student', isStudentSelect: true },
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
      { name: 'term', label: 'Term', type: 'text', placeholder: 'e.g., First Term' }
    ]
  },
  'student-skill-tracker': {
    name: 'Student Skill Tracker',
    description: 'Monitor and track student skill development',
    icon: 'trending-up',
    color: '#14b8a6',
    fields: [
      { name: 'studentName', label: 'Student Name *', type: 'select', required: true, placeholder: 'Select student', isStudentSelect: true },
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' }
    ]
  },
  'daily-class-plan-maker': {
    name: 'Daily Class Plan Maker',
    description: 'Organize your daily teaching schedule efficiently',
    icon: 'checkmark-square',
    color: '#14b8a6',
    fields: [
      { name: 'date', label: 'Date', type: 'text', placeholder: 'e.g., 2025-01-15' },
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subjects', label: 'Subjects *', type: 'text', required: true, placeholder: 'e.g., Physics, Chemistry, Mathematics' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
      { name: 'timeSlots', label: 'Time Slots', type: 'text', placeholder: 'e.g., 9:00-10:00, 10:15-11:15' }
    ]
  },
  'exam-question-paper-generator': {
    name: 'Exam Question Paper Generator',
    description: 'Create comprehensive exam papers with varying difficulty',
    icon: 'help-circle',
    color: '#8b5cf6',
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
      { name: 'duration', label: 'Exam Duration (minutes)', type: 'number', placeholder: '90' },
      { name: 'difficulty', label: 'Difficulty Mix', type: 'select', options: ['easy', 'medium', 'hard', 'mixed'] }
    ]
  },
};

export default function TeacherToolPage() {
  const { toolType } = useLocalSearchParams<{ toolType: string }>();
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [assignedStudents, setAssignedStudents] = useState<Array<{id: string, name: string, classNumber?: string}>>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  const config = toolType ? TOOL_CONFIGS[toolType] : null;

  useEffect(() => {
    // Fetch assigned students if this tool needs student selection
    if (toolType === 'student-skill-tracker' || toolType === 'report-card-generator') {
      fetchStudents();
    }
  }, [toolType]);

  const fetchStudents = async () => {
    try {
      setIsLoadingStudents(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const studentsData = data.data || data.students || data || [];
        const mappedStudents = (Array.isArray(studentsData) ? studentsData : []).map((student: any) => ({
          id: student._id || student.id,
          name: student.fullName || student.name || 'Unknown Student',
          classNumber: student.classNumber || student.assignedClass?.classNumber
        }));
        setAssignedStudents(mappedStudents);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setIsLoadingStudents(false);
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

  const handleInputChange = (fieldName: string, value: any) => {
    setFormParams(prev => {
      const updated = { ...prev, [fieldName]: value };
      
      // If gradeLevel changes, clear dependent fields (like subject)
      if (fieldName === 'gradeLevel') {
        Object.keys(updated).forEach(key => {
          const field = config.fields.find(f => f.name === key);
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
    
    if (field.isStudentSelect) {
      return assignedStudents.map(s => s.name);
    }
    
    return [];
  };

  const handleGenerate = async () => {
    // Validate required fields
    const requiredFields = config.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !formParams[f.name]);
    
    if (missingFields.length > 0) {
      Alert.alert('Validation Error', `Please fill in: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const token = await SecureStore.getItemAsync('authToken');
      
      const response = await fetch(`${API_BASE_URL}/api/teacher/ai/tool`, {
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
        title: config.name
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

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

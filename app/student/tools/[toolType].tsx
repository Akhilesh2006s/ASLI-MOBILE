import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
  Pressable,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { useBackNavigation, getDashboardPath } from '../../../src/hooks/useBackNavigation';
import {
  resolveStudentAiApiToolType,
  resolveStudentToolConfigKey,
  filterSubjectsForAiTool,
  isStoryPassageLanguageSubject,
  READING_PRACTICE_TOOL_ID,
} from '../../../src/lib/student-ai-tools';
import {
  CLASS_OPTIONS,
  getStudentToolConfig,
  type StudentToolFieldConfig,
} from '../../../src/lib/student-ai-tool-configs';
import {
  getAiToolBoardOptions,
  getDefaultAiToolBoard,
  mapGradeLevelForIitBoard,
  resolveCurriculumBoardForAiTools,
  resolveIsAsliPrepExclusive,
} from '../../../src/lib/school-program-ai';
import {
  useCurriculumCascade,
  isGradeWithScienceCurriculumDropdowns,
} from '../../../src/hooks/useCurriculumCascade';

function mergeSelectedIntoOptions(options: string[], selected: unknown): string[] {
  const v = typeof selected === 'string' ? selected.trim() : '';
  if (!v) return options;
  if (options.includes(v)) return options;
  return [v, ...options];
}

const FIELD_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  board: 'school-outline',
  gradeLevel: 'layers-outline',
  subject: 'book-outline',
  topic: 'document-text-outline',
  chapter: 'document-text-outline',
  subTopic: 'list-outline',
  concept: 'bulb-outline',
  projectTopic: 'construct-outline',
  questionCount: 'help-circle-outline',
  difficulty: 'speedometer-outline',
  duration: 'time-outline',
  focusAreas: 'telescope-outline',
  assignmentType: 'clipboard-outline',
};

type DropdownState = {
  fieldName: string;
  title: string;
  options: string[];
  value: string;
  disabled: boolean;
};

function FormSection({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: accent }]} />
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function StudentToolPage() {
  const { width } = useWindowDimensions();
  const isWide = width >= 480;
  const { toolType } = useLocalSearchParams<{ toolType: string }>();
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [availableNCERTTopics, setAvailableNCERTTopics] = useState<string[]>([]);
  const [schoolBoardName, setSchoolBoardName] = useState('CBSE');
  const [isAsliPrepExclusive, setIsAsliPrepExclusive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownState | null>(null);

  const configKey = toolType ? resolveStudentToolConfigKey(toolType) : '';
  const config = configKey ? getStudentToolConfig(configKey) || getStudentToolConfig(toolType || '') : null;
  const apiToolType = toolType ? resolveStudentAiApiToolType(toolType) : '';
  const isReadingPractice =
    toolType === READING_PRACTICE_TOOL_ID || toolType === 'story-passage-creator';
  const accent = config?.color || '#3b82f6';

  const boardOptions = getAiToolBoardOptions(isAsliPrepExclusive, schoolBoardName);
  const selectedBoard = formParams.board || getDefaultAiToolBoard(isAsliPrepExclusive, schoolBoardName);
  const cascadeTopic = formParams.topic || formParams.chapter || '';

  const cascade = useCurriculumCascade(
    formParams.gradeLevel,
    formParams.subject,
    cascadeTopic,
    selectedBoard
  );

  const classSelectOptions =
    cascade.classOptions.length > 0 ? cascade.classOptions : CLASS_OPTIONS;

  const availableSubjects = useMemo(() => {
    const gv = formParams.gradeLevel;
    if (!gv || !isGradeWithScienceCurriculumDropdowns(gv)) return [];
    const raw = cascade.subjects;
    if (cascade.loadingSubjects && raw.length === 0) return [];
    if (raw.length > 0) return raw;
    return [];
  }, [formParams.gradeLevel, cascade.subjects, cascade.loadingSubjects]);

  const subjectsForTool = useMemo(
    () => filterSubjectsForAiTool(apiToolType, availableSubjects),
    [apiToolType, availableSubjects]
  );

  const { curriculumFields, topicFields, extraFields } = useMemo(() => {
    if (!config) return { curriculumFields: [], topicFields: [], extraFields: [] };
    const curriculum: StudentToolFieldConfig[] = [];
    const topic: StudentToolFieldConfig[] = [];
    const extra: StudentToolFieldConfig[] = [];
    for (const field of config.fields) {
      if (field.name === 'gradeLevel' || field.name === 'subject') {
        curriculum.push(field);
      } else if (field.isNCERT || field.isCascadeSubtopic) {
        topic.push(field);
      } else {
        extra.push(field);
      }
    }
    return { curriculumFields: curriculum, topicFields: topic, extraFields: extra };
  }, [config]);

  const completion = useMemo(() => {
    if (!config) return { filled: 0, total: 1, percent: 0 };
    const required = [
      { name: 'board', label: 'Board' },
      ...config.fields.filter((f) => f.required).map((f) => ({ name: f.name, label: f.label })),
    ];
    const filled = required.filter((f) => Boolean(formParams[f.name])).length;
    return {
      filled,
      total: required.length,
      percent: Math.round((filled / required.length) * 100),
    };
  }, [config, formParams]);

  useEffect(() => {
    getDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
    fetchUser();
  }, []);

  useBackNavigation(dashboardPath, false);

  useEffect(() => {
    if (isLoadingUser || !formParams.board) return;
    if (!boardOptions.includes(formParams.board)) {
      const fallback = getDefaultAiToolBoard(isAsliPrepExclusive, schoolBoardName);
      setFormParams((prev) => ({ ...prev, board: fallback }));
    }
  }, [boardOptions, formParams.board, isAsliPrepExclusive, isLoadingUser, schoolBoardName]);

  useEffect(() => {
    const classValue = formParams.gradeLevel;
    const subjectValue = formParams.subject;
    if (!classValue || !subjectValue) {
      setAvailableNCERTTopics([]);
      return;
    }
    if (cascade.loadingTopics && cascade.topics.length === 0) {
      setAvailableNCERTTopics([]);
      return;
    }
    setAvailableNCERTTopics([...cascade.topics]);
  }, [formParams.gradeLevel, formParams.subject, cascade.topics, cascade.loadingTopics]);

  useEffect(() => {
    if (!isReadingPractice) return;
    const sub = formParams.subject;
    if (!sub || isStoryPassageLanguageSubject(sub)) return;
    setFormParams((prev) => {
      const next = { ...prev };
      delete next.subject;
      delete next.topic;
      delete next.subTopic;
      return next;
    });
  }, [isReadingPractice, formParams.subject]);

  const fetchUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        const exclusive = resolveIsAsliPrepExclusive(userData.user);
        setIsAsliPrepExclusive(exclusive);
        const curriculumBoard = resolveCurriculumBoardForAiTools(userData.user);
        const defaultBoard = getDefaultAiToolBoard(exclusive, curriculumBoard);
        setSchoolBoardName(curriculumBoard);
        setFormParams((prev) => ({
          ...prev,
          board: prev.board || defaultBoard,
        }));

        if (userData.user) {
          const studentClass = userData.user.assignedClass?.classNumber || userData.user.classNumber;
          if (studentClass) {
            let classValue = studentClass.toString().trim();
            classValue = classValue.replace(/^Class\s*/i, '');
            const classNum = classValue.replace(/[^-\d]/g, '');
            const absNum = Math.abs(parseInt(classNum, 10));

            if (!isNaN(absNum) && absNum >= 6 && absNum <= 12) {
              const mappedClass = `Class ${absNum}`;
              if (CLASS_OPTIONS.includes(mappedClass)) {
                setFormParams((prev) => ({ ...prev, gradeLevel: mappedClass }));
              }
            } else if (classValue.toLowerCase().includes('dropper')) {
              setFormParams((prev) => ({ ...prev, gradeLevel: 'Dropper Batch' }));
            } else if (
              classValue.toLowerCase().includes('iit') ||
              classValue === 'IIT-6' ||
              classValue === 'Class-6-IIT'
            ) {
              setFormParams((prev) => ({ ...prev, gradeLevel: 'Class 6' }));
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormParams((prev) => {
      const newParams = { ...prev, [name]: value };

      if (name === 'gradeLevel') {
        delete newParams.subject;
        delete newParams.topic;
        delete newParams.subTopic;
        delete newParams.concept;
        delete newParams.chapter;
        delete newParams.projectTopic;
      }
      if (name === 'subject') {
        delete newParams.topic;
        delete newParams.subTopic;
        delete newParams.concept;
        delete newParams.chapter;
        delete newParams.projectTopic;
      }
      if (name === 'topic' || name === 'chapter') {
        delete newParams.subTopic;
      }
      if (name === 'board') {
        delete newParams.subject;
        delete newParams.topic;
        delete newParams.subTopic;
        delete newParams.concept;
        delete newParams.chapter;
        delete newParams.projectTopic;
        if (String(value).toUpperCase() === 'IIT') {
          const iitClass = cascade.classOptions.find((c) => /iit/i.test(c)) || 'Class 6';
          newParams.gradeLevel = iitClass;
        }
      }

      return newParams;
    });
  };

  const getFieldOptions = useCallback(
    (field: StudentToolFieldConfig): string[] => {
      if (field.options) return field.options;

      if (field.name === 'subject' && field.dependsOn === 'gradeLevel') {
        const classValue = formParams[field.dependsOn];
        if (classValue && subjectsForTool.length > 0) return subjectsForTool;
        return [];
      }

      if (field.isCascadeSubtopic && field.name === 'subTopic') {
        return cascade.subtopics;
      }

      if (
        field.isNCERT &&
        (field.name === 'topic' ||
          field.name === 'concept' ||
          field.name === 'chapter' ||
          field.name === 'projectTopic')
      ) {
        return availableNCERTTopics;
      }

      if (field.dependsOn && field.getOptions) {
        const parentValue = formParams[field.dependsOn];
        if (parentValue) return field.getOptions(parentValue);
      return [];
    }
    
    return [];
    },
    [formParams, subjectsForTool, cascade.subtopics, availableNCERTTopics]
  );

  const getFieldDisabledState = (field: StudentToolFieldConfig) => {
    let isDisabled = !!(field.dependsOn && !formParams[field.dependsOn]);
    let loading = false;

    if (field.name === 'gradeLevel') {
      isDisabled = cascade.loadingClasses && classSelectOptions.length === 0;
      loading = cascade.loadingClasses;
    } else if (field.name === 'subject' && field.dependsOn === 'gradeLevel') {
      loading = cascade.loadingSubjects;
      isDisabled = !formParams.gradeLevel || cascade.loadingSubjects || isLoadingUser;
    } else if (
      field.isNCERT &&
      (field.name === 'topic' ||
        field.name === 'concept' ||
        field.name === 'chapter' ||
        field.name === 'projectTopic')
    ) {
      loading = cascade.loadingTopics;
      isDisabled = !formParams.gradeLevel || !formParams.subject || cascade.loadingTopics;
    } else if (field.isCascadeSubtopic && field.name === 'subTopic') {
      loading = cascade.loadingSubtopics;
      isDisabled =
        !formParams.gradeLevel ||
        !formParams.subject ||
        !(formParams.topic || formParams.chapter) ||
        cascade.loadingSubtopics;
    }

    const isClassFieldDisabled = field.name === 'gradeLevel' && !!user?.classNumber;
    return { isDisabled: isDisabled || isClassFieldDisabled, loading, isClassFieldDisabled };
  };

  const getPlaceholderHint = (
    field: StudentToolFieldConfig,
    fieldOptions: string[],
    isDisabled: boolean
  ) => {
    if (!isDisabled) return field.placeholder || `Select ${field.label.replace(' *', '')}`;

    if (field.name === 'gradeLevel' && cascade.loadingClasses) return 'Loading classes...';
    if (field.name === 'subject') {
      if (!formParams.gradeLevel || cascade.loadingSubjects) return 'Select class first';
      if (subjectsForTool.length === 0) {
        return isReadingPractice ? 'English or Hindi only' : 'No subjects available';
      }
    }
    if (
      field.isNCERT &&
      (field.name === 'topic' ||
        field.name === 'concept' ||
        field.name === 'chapter' ||
        field.name === 'projectTopic')
    ) {
      if (!formParams.gradeLevel) return 'Select class first';
      if (!formParams.subject || cascade.loadingTopics) return 'Select subject first';
      if (cascade.loadingTopics) return 'Loading topics...';
      if (fieldOptions.length === 0) return 'No topics available';
    }
    if (field.isCascadeSubtopic) {
      if (!(formParams.topic || formParams.chapter)) return 'Select topic first';
      if (cascade.loadingSubtopics) return 'Loading subtopics...';
      if (cascade.subtopics.length === 0 && !String(formParams.subTopic || '').trim()) {
        return 'No subtopics available';
      }
    }
    if (fieldOptions.length === 0 && field.dependsOn) {
      const parent = config?.fields.find((f) => f.name === field.dependsOn);
      return `Select ${parent?.label.replace(' *', '') || 'class'} first`;
    }
    return field.placeholder || 'No options available';
  };

  const openDropdown = (
    fieldName: string,
    title: string,
    options: string[],
    value: string,
    disabled: boolean
  ) => {
    if (disabled || options.length === 0) return;
    setActiveDropdown({ fieldName, title, options, value, disabled });
  };

  const handleGenerate = async () => {
    if (!config) return;

    const requiredFields = config.fields.filter((f) => f.required);
    const missingFields = requiredFields.filter((f) => !formParams[f.name]);
    
    if (missingFields.length > 0) {
      Alert.alert('Validation Error', `Please fill in: ${missingFields.map((f) => f.label).join(', ')}`);
      return;
    }

    if (!formParams.board) {
      Alert.alert('Validation Error', 'Please select a board.');
      return;
    }

    if (isReadingPractice && !isStoryPassageLanguageSubject(String(formParams.subject || ''))) {
      Alert.alert(
        'English or Hindi only',
        'Reading Practice Room works only with English or Hindi subjects.'
      );
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const mappedTopic =
        formParams.topic ||
        formParams.concept ||
        formParams.chapter ||
        formParams.projectTopic ||
        '';

      const requestBody: Record<string, unknown> = {
        toolType: apiToolType,
        ...formParams,
        board: selectedBoard,
        gradeLevel: mapGradeLevelForIitBoard(selectedBoard, formParams.gradeLevel),
        subject: formParams.subject || formParams.subjects,
        topic: mappedTopic,
      };
      
      const response = await fetch(`${API_BASE_URL}/api/student/ai/tool`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
    } catch (error) {
      console.error('Copy error:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: generatedContent, title: config?.name });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const renderDropdownTrigger = (
    fieldName: string,
    label: string,
    value: string,
    hint: string,
    options: string[],
    disabled: boolean,
    loading: boolean,
    required?: boolean
  ) => {
    const icon = FIELD_ICONS[fieldName] || 'chevron-down-circle-outline';
    const display = value || hint;
    const isPlaceholder = !value;

    return (
      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <View style={[styles.fieldIconWrap, { backgroundColor: `${accent}18` }]}>
            <Ionicons name={icon} size={16} color={accent} />
          </View>
          <Text style={styles.fieldLabel}>
            {label.replace(' *', '')}
            {required ? <Text style={styles.required}> *</Text> : null}
          </Text>
          {loading ? <ActivityIndicator size="small" color={accent} style={styles.fieldSpinner} /> : null}
        </View>
          <TouchableOpacity
          style={[styles.dropdownTrigger, disabled && styles.dropdownTriggerDisabled]}
          onPress={() => openDropdown(fieldName, label.replace(' *', ''), options, value, disabled)}
          activeOpacity={0.75}
          disabled={disabled}
        >
          <Text
            style={[styles.dropdownValue, isPlaceholder && styles.dropdownPlaceholder]}
            numberOfLines={2}
          >
            {display}
          </Text>
          <Ionicons name="chevron-down" size={18} color={disabled ? '#cbd5e1' : '#64748b'} />
          </TouchableOpacity>
        </View>
    );
  };

  const renderSelectField = (field: StudentToolFieldConfig) => {
    const value = formParams[field.name] || '';
    const { isDisabled, loading } = getFieldDisabledState(field);

    if (field.name === 'gradeLevel' && user?.classNumber && value) {
      return (
        <View key={field.name} style={styles.fieldBlock}>
          <View style={styles.labelRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: `${accent}18` }]}>
              <Ionicons name="layers-outline" size={16} color={accent} />
            </View>
            <Text style={styles.fieldLabel}>Class</Text>
          </View>
          <View style={styles.lockedField}>
            <Text style={styles.lockedValue}>{value}</Text>
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={12} color="#64748b" />
              <Text style={styles.lockedBadgeText}>Assigned</Text>
            </View>
          </View>
        </View>
      );
    }

    let fieldOptions = getFieldOptions(field);
    if (field.name === 'gradeLevel') fieldOptions = classSelectOptions;
    else if (field.name === 'subject' && field.dependsOn === 'gradeLevel') fieldOptions = subjectsForTool;
    fieldOptions = mergeSelectedIntoOptions(fieldOptions, value);
    const hint = getPlaceholderHint(field, fieldOptions, isDisabled);

    return (
      <View key={field.name}>
        {renderDropdownTrigger(
          field.name,
          field.label,
          value,
          hint,
          fieldOptions,
          isDisabled,
          loading,
          field.required
        )}
      </View>
    );
  };

  const renderField = (field: StudentToolFieldConfig) => {
    const value = formParams[field.name] || '';

    if (field.type === 'select') return renderSelectField(field);

    if (field.type === 'textarea') {
      return (
        <View key={field.name} style={styles.fieldBlock}>
          <View style={styles.labelRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: `${accent}18` }]}>
              <Ionicons name={FIELD_ICONS[field.name] || 'create-outline'} size={16} color={accent} />
            </View>
            <Text style={styles.fieldLabel}>
              {field.label.replace(' *', '')}
              {field.required ? <Text style={styles.required}> *</Text> : null}
          </Text>
          </View>
          <TextInput
            style={[styles.textArea, styles.textInput]}
            placeholder={field.placeholder}
            value={value}
            onChangeText={(text) => handleInputChange(field.name, text)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#94a3b8"
          />
        </View>
      );
    }
      
      return (
      <View key={field.name} style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <View style={[styles.fieldIconWrap, { backgroundColor: `${accent}18` }]}>
            <Ionicons name={FIELD_ICONS[field.name] || 'options-outline'} size={16} color={accent} />
        </View>
          <Text style={styles.fieldLabel}>
            {field.label.replace(' *', '')}
            {field.required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        </View>
        <TextInput
          style={styles.textInput}
          placeholder={field.placeholder}
          value={value}
          onChangeText={(text) => handleInputChange(field.name, text)}
          keyboardType={field.type === 'number' ? 'numeric' : 'default'}
          placeholderTextColor="#94a3b8"
        />
      </View>
    );
  };

  if (!config) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          </View>
          <Text style={styles.errorTitle}>Tool not found</Text>
          <Text style={styles.errorSubtitle}>This AI tool is not available on mobile yet.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const wordCount = generatedContent.trim() ? generatedContent.trim().split(/\s+/).length : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <LinearGradient colors={[accent, `${accent}CC`]} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color="#fff" />
            <Text style={styles.aiBadgeText}>Vidya AI</Text>
          </View>
        </View>

        <View style={[styles.heroBody, isWide && styles.heroBodyWide]}>
          <View style={styles.heroIconWrap}>
            <Ionicons name={config.icon} size={28} color="#fff" />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>{config.name}</Text>
            <Text style={styles.heroSubtitle} numberOfLines={3}>
              {config.description}
            </Text>
          </View>
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressMeta}>
            <Text style={styles.progressLabel}>Form progress</Text>
            <Text style={styles.progressValue}>
              {completion.filled}/{completion.total} fields
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completion.percent}%` }]} />
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: generatedContent ? 24 : 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FormSection title="Curriculum" subtitle="Board and class details" accent={accent}>
            {renderDropdownTrigger(
              'board',
              'Board',
              selectedBoard,
              'Select board',
              boardOptions,
              isLoadingUser,
              false,
              true
            )}
            {curriculumFields.map(renderField)}
            {isReadingPractice ? (
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={18} color="#2563eb" />
                <Text style={styles.infoBannerText}>
                  English and Hindi subjects only for this tool.
                </Text>
              </View>
            ) : null}
          </FormSection>

          {topicFields.length > 0 ? (
            <FormSection title="Topic details" subtitle="Pick chapter and sub-topic from syllabus" accent={accent}>
              {topicFields.map(renderField)}
            </FormSection>
          ) : null}

          {extraFields.length > 0 ? (
            <FormSection title="Options" subtitle="Customize your output" accent={accent}>
              {extraFields.map(renderField)}
            </FormSection>
          ) : null}

          {generatedContent ? (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View>
                  <Text style={styles.resultTitle}>Generated content</Text>
                  <Text style={styles.resultMeta}>{wordCount.toLocaleString()} words</Text>
                </View>
                <View style={styles.resultActions}>
        <TouchableOpacity
                    style={[styles.resultActionBtn, copied && styles.resultActionBtnActive]}
                    onPress={handleCopy}
        >
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#059669' : accent} />
        </TouchableOpacity>
                  <TouchableOpacity style={styles.resultActionBtn} onPress={handleShare}>
                    <Ionicons name="share-outline" size={18} color={accent} />
                  </TouchableOpacity>
          </View>
          </View>
              <View style={styles.resultDivider} />
              <Text style={styles.resultText} selectable>
                {generatedContent}
              </Text>
        </View>
          ) : (
            <View style={styles.emptyResult}>
              <Ionicons name="document-text-outline" size={32} color="#cbd5e1" />
              <Text style={styles.emptyResultTitle}>Your AI output will appear here</Text>
              <Text style={styles.emptyResultText}>Fill the form above and tap Generate</Text>
        </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
        <TouchableOpacity
            style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
            activeOpacity={0.9}
        >
          <LinearGradient
              colors={[accent, `${accent}DD`]}
              style={styles.generateBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isGenerating ? (
                <>
              <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.generateBtnText}>Generating...</Text>
                </>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={styles.generateBtnText}>Generate with AI</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={!!activeDropdown}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActiveDropdown(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{activeDropdown?.title}</Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {(activeDropdown?.options || []).map((option) => {
                const selected = activeDropdown?.value === option;
                return (
                <TouchableOpacity
                    key={option}
                    style={[styles.modalItem, selected && styles.modalItemSelected]}
                    onPress={() => {
                      if (activeDropdown) handleInputChange(activeDropdown.fieldName, option);
                      setActiveDropdown(null);
                    }}
                  >
                    <Text style={[styles.modalItemText, selected && styles.modalItemTextSelected]}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={accent} /> : null}
                </TouchableOpacity>
                );
              })}
      </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setActiveDropdown(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  flex: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  aiBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroBodyWide: { alignItems: 'center' },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 19 },
  progressWrap: { marginTop: 18 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  progressValue: { fontSize: 12, color: '#fff', fontWeight: '700' },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionAccent: { width: 4 },
  sectionHeaderText: { flex: 1, paddingHorizontal: 16, paddingVertical: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sectionSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  sectionBody: { padding: 16, gap: 14 },
  fieldBlock: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#334155' },
  fieldSpinner: { marginLeft: 'auto' },
  required: { color: '#ef4444' },
  dropdownTrigger: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dropdownTriggerDisabled: { opacity: 0.55, backgroundColor: '#f1f5f9' },
  dropdownValue: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  dropdownPlaceholder: { color: '#94a3b8', fontWeight: '500' },
  lockedField: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lockedBadgeText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  textInput: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: { minHeight: 110, paddingTop: 14, paddingBottom: 14 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoBannerText: { flex: 1, fontSize: 13, color: '#1d4ed8', lineHeight: 18 },
  emptyResult: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyResultTitle: { marginTop: 12, fontSize: 15, fontWeight: '700', color: '#64748b' },
  emptyResultText: { marginTop: 4, fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resultTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  resultMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  resultActions: { flexDirection: 'row', gap: 8 },
  resultActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  resultActionBtnActive: { borderColor: '#86efac', backgroundColor: '#ecfdf5' },
  resultDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
  resultText: { fontSize: 15, color: '#1e293b', lineHeight: 24 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  generateBtn: { borderRadius: 16, overflow: 'hidden' },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  generateBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  modalList: { maxHeight: 360 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalItemSelected: { backgroundColor: '#f8fafc' },
  modalItemText: { fontSize: 16, color: '#334155', flex: 1, paddingRight: 12 },
  modalItemTextSelected: { fontWeight: '700', color: '#0f172a' },
  modalCloseBtn: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  errorSubtitle: { fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center' },
  errorButton: {
    marginTop: 24,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

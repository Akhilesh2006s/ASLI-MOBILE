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
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';
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
  resolveStudentCurriculumGradeLevel,
} from '../../../src/lib/school-program-ai';
import {
  useCurriculumCascade,
  isGradeWithScienceCurriculumDropdowns,
} from '../../../src/hooks/useCurriculumCascade';
import StudentScreenHeader from '../../../src/components/student/StudentScreenHeader';
import GlassCard from '../../../src/components/student/GlassCard';
import AiToolContentRenderer from '../../../src/components/ai-tools/AiToolContentRenderer';
import { stripStructuredAiToolMetadata } from '../../../src/lib/strip-ai-tool-metadata';
import {
  validateAiToolForm,
  executeAiToolGenerate,
  buildStudentAiRequestBody,
  storeAiToolSuccessPayload,
  type AiToolGenerationMeta,
} from '../../../src/lib/ai-tool-generate';
import {
  STUDENT,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
} from '../../../src/theme/student';

function mergeSelectedIntoOptions(options: string[], selected: unknown): string[] {
  const v = typeof selected === 'string' ? selected.trim() : '';
  if (!v) return options;
  if (options.includes(v)) return options;
  return [v, ...options];
}

const HEADER_COLLAPSE_DISTANCE = 72;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

function ParametersSummaryBar({
  summary,
  accent,
  expanded,
  onToggle,
}: {
  summary: string;
  accent: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable style={styles.paramsSummary} onPress={onToggle}>
      <View style={[styles.paramsSummaryIcon, { backgroundColor: `${accent}22` }]}>
        <Ionicons name="options-outline" size={18} color={accent} />
      </View>
      <View style={styles.paramsSummaryText}>
        <Text style={styles.paramsSummaryTitle}>
          {expanded ? 'Hide parameters' : 'Show parameters'}
        </Text>
        {!expanded && summary ? (
          <Text style={styles.paramsSummaryMeta} numberOfLines={1}>
            {summary}
          </Text>
        ) : null}
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={STUDENT.textMuted} />
    </Pressable>
  );
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
    <GlassCard padding={0}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: accent }]} />
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </GlassCard>
  );
}

export default function StudentToolPage() {
  const { toolType } = useLocalSearchParams<{ toolType: string }>();
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [rawGeneratedContent, setRawGeneratedContent] = useState<unknown>(null);
  const [responseMeta, setResponseMeta] = useState<AiToolGenerationMeta | null>(null);
  const [fallbackEmptyMessage, setFallbackEmptyMessage] = useState('');
  const [fromAiFailure, setFromAiFailure] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [availableNCERTTopics, setAvailableNCERTTopics] = useState<string[]>([]);
  const [schoolBoardName, setSchoolBoardName] = useState('CBSE');
  const [isAsliPrepExclusive, setIsAsliPrepExclusive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownState | null>(null);
  const [paramsExpanded, setParamsExpanded] = useState(true);
  const scrollY = useSharedValue(0);

  const configKey = toolType ? resolveStudentToolConfigKey(toolType) : '';
  const config = configKey ? getStudentToolConfig(configKey) || getStudentToolConfig(toolType || '') : null;
  const apiToolType = toolType ? resolveStudentAiApiToolType(toolType) : '';
  const isReadingPractice =
    toolType === READING_PRACTICE_TOOL_ID || toolType === 'story-passage-creator';
  const isSmartStudyGuide = toolType === 'smart-study-guide-generator';
  const accent = isSmartStudyGuide ? '#4f46e5' : config?.color || '#3b82f6';
  const displayGeneratedContent = useMemo(
    () => stripStructuredAiToolMetadata(generatedContent),
    [generatedContent]
  );

  const boardOptions = getAiToolBoardOptions(isAsliPrepExclusive, schoolBoardName);
  const selectedBoard = formParams.board || getDefaultAiToolBoard(isAsliPrepExclusive, schoolBoardName);

  const paramsSummary = useMemo(() => {
    return [
      selectedBoard,
      formParams.gradeLevel,
      formParams.subject,
      formParams.topic || formParams.chapter,
      formParams.subTopic,
    ]
      .filter((v) => typeof v === 'string' && v.trim())
      .join(' · ');
  }, [selectedBoard, formParams]);

  const showCollapsedParams = !!generatedContent && !isGenerating;
  const showParameterForms = !showCollapsedParams || paramsExpanded;

  useEffect(() => {
    if (generatedContent) {
      setParamsExpanded(false);
    }
  }, [generatedContent]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(
      scrollY.value,
      [0, HEADER_COLLAPSE_DISTANCE],
      [140, 0],
      Extrapolation.CLAMP
    ),
    opacity: interpolate(scrollY.value, [0, HEADER_COLLAPSE_DISTANCE * 0.65], [1, 0], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }));

  const compactHeaderAnimatedStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(
      scrollY.value,
      [HEADER_COLLAPSE_DISTANCE * 0.4, HEADER_COLLAPSE_DISTANCE],
      [0, 52],
      Extrapolation.CLAMP
    ),
    opacity: interpolate(
      scrollY.value,
      [HEADER_COLLAPSE_DISTANCE * 0.4, HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP
    ),
    overflow: 'hidden' as const,
  }));
  const cascadeTopic = formParams.topic || formParams.chapter || '';
  const assignedGradeLevel = useMemo(
    () => resolveStudentCurriculumGradeLevel(user),
    [user]
  );

  const cascade = useCurriculumCascade(
    formParams.gradeLevel,
    formParams.subject,
    cascadeTopic,
    selectedBoard
  );

  const classSelectOptions = useMemo(() => {
    if (assignedGradeLevel) return [assignedGradeLevel];
    return cascade.classOptions.length > 0 ? cascade.classOptions : CLASS_OPTIONS;
  }, [assignedGradeLevel, cascade.classOptions]);

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

  useEffect(() => {
    if (!assignedGradeLevel) return;
    setFormParams((prev) => {
      if (prev.gradeLevel === assignedGradeLevel) return prev;
      return { ...prev, gradeLevel: assignedGradeLevel };
    });
  }, [assignedGradeLevel]);

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

        const curriculumGrade = resolveStudentCurriculumGradeLevel(userData.user);
        if (curriculumGrade) {
          setFormParams((prev) => ({ ...prev, gradeLevel: curriculumGrade }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    if (name === 'gradeLevel' && assignedGradeLevel) return;

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
        if (assignedGradeLevel) {
          newParams.gradeLevel = assignedGradeLevel;
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

    const isClassFieldDisabled = field.name === 'gradeLevel' && !!assignedGradeLevel;
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

    const validationError = validateAiToolForm({
      config,
      formParams,
      isReadingPractice,
      requireBoard: true,
    });
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setRawGeneratedContent(null);
    setResponseMeta(null);
    setFallbackEmptyMessage('');
    setFromAiFailure(false);

    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        Alert.alert('Error', 'Please sign in again.');
        return;
      }

      const requestBody = buildStudentAiRequestBody(
        apiToolType,
        formParams,
        selectedBoard,
        mapGradeLevelForIitBoard
      );

      const result = await executeAiToolGenerate({
        endpoint: `${API_BASE_URL}/api/student/ai/tool`,
        token,
        requestBody,
      });

      if (!result.ok) {
        setGeneratedContent('');
        setRawGeneratedContent(null);
        setResponseMeta(null);
        setFallbackEmptyMessage(result.fallbackMessage);
        Alert.alert(result.title, result.message);
        return;
      }

      setResponseMeta(result.metadata);
      setFromAiFailure(result.fromAiFailure);

      const stored = storeAiToolSuccessPayload(toolType || '', result.content, result.rawContent, 'student');
      setGeneratedContent(stored.generatedContent);
      setRawGeneratedContent(stored.rawGeneratedContent);

      if (result.fromAiFailure) {
        Alert.alert('Stored content (AI unavailable)', 'Showing stored content.');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      setFallbackEmptyMessage(error.message || 'Network error. Please try again.');
      Alert.alert('Error', error.message || 'Network error. Please try again.');
    } finally {
      setIsGenerating(false);
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
          <Ionicons name="chevron-down" size={18} color={disabled ? STUDENT.navInactive : STUDENT.textMuted} />
          </TouchableOpacity>
        </View>
    );
  };

  const renderSelectField = (field: StudentToolFieldConfig) => {
    const value = formParams[field.name] || '';
    const { isDisabled, loading } = getFieldDisabledState(field);

    if (field.name === 'gradeLevel' && assignedGradeLevel) {
      return (
        <View key={field.name} style={styles.fieldBlock}>
          <View style={styles.labelRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: `${accent}18` }]}>
              <Ionicons name="layers-outline" size={16} color={accent} />
            </View>
            <Text style={styles.fieldLabel}>Class</Text>
          </View>
          <View style={styles.lockedField}>
            <Text style={styles.lockedValue}>{assignedGradeLevel}</Text>
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={12} color={STUDENT.textMuted} />
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
            placeholderTextColor={STUDENT.navInactive}
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
          placeholderTextColor={STUDENT.navInactive}
        />
      </View>
    );
  };

  if (!config) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <StudentScreenHeader title="Tool not found" onBack={() => router.back()} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={STUDENT.danger} />
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

  const parameterTitle = isSmartStudyGuide ? 'Customize your premium guide' : 'Tool Parameters';
  const pageBgStyle = isSmartStudyGuide ? styles.containerPremium : styles.container;

  return (
    <SafeAreaView style={pageBgStyle} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <Animated.View style={headerAnimatedStyle}>
        <StudentScreenHeader
          title={config.name}
          subtitle={config.description}
          onBack={() => router.back()}
        />
      </Animated.View>

      <Animated.View style={[styles.compactHeader, compactHeaderAnimatedStyle]}>
        <LinearGradient
          colors={[...STUDENT.heroGradient]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.compactHeaderRow}>
          <Pressable
            style={styles.compactBackBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={STUDENT.textOnPrimary} />
          </Pressable>
          <Text style={styles.compactHeaderTitle} numberOfLines={1}>
            {config.name}
          </Text>
          <View style={styles.compactHeaderSpacer} />
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <AnimatedScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: generatedContent ? 24 : 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {showCollapsedParams ? (
            <ParametersSummaryBar
              summary={paramsSummary}
              accent={accent}
              expanded={paramsExpanded}
              onToggle={() => setParamsExpanded((prev) => !prev)}
            />
          ) : null}

          {showParameterForms ? (
            <>
              <FormSection
                title={parameterTitle}
                subtitle={isSmartStudyGuide ? 'Board, class, subject, topic and sub-topic' : 'Board and class details'}
                accent={accent}
              >
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
                    <Ionicons name="information-circle" size={18} color={STUDENT.accent} />
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
            </>
          ) : null}

          {isGenerating ? (
            <View style={styles.generatingBox}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={styles.generatingTitle}>Generating Content...</Text>
              <Text style={styles.generatingText}>Please wait while we prepare your content</Text>
            </View>
          ) : generatedContent ? (
            <AiToolContentRenderer
              toolType={toolType || ''}
              content={displayGeneratedContent}
              rawContent={rawGeneratedContent}
              accent={accent}
              variant="student"
            />
          ) : (
            <View style={styles.emptyResult}>
              <View style={styles.emptyResultIcon}>
                <Ionicons name="sparkles" size={28} color={STUDENT.navInactive} />
              </View>
              <Text style={styles.emptyResultTitle}>
                {fallbackEmptyMessage || 'Generated content will appear here'}
              </Text>
              <Text style={styles.emptyResultText}>Choose tool parameters and tap Generate.</Text>
            </View>
          )}
        </AnimatedScrollView>

        <View style={styles.footer}>
        <TouchableOpacity
            style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
            activeOpacity={0.9}
        >
          <LinearGradient
              colors={
                isSmartStudyGuide
                  ? ['#4f46e5', '#2563eb', '#0891b2']
                  : [accent, `${accent}DD`]
              }
              style={styles.generateBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isGenerating ? (
                <>
              <ActivityIndicator size="small" color={STUDENT.textOnPrimary} />
                  <Text style={styles.generateBtnText}>Generating...</Text>
                </>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={STUDENT.textOnPrimary} />
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
  container: { flex: 1, backgroundColor: STUDENT.bg },
  containerPremium: { flex: 1, backgroundColor: '#f5f7ff' },
  flex: { flex: 1 },
  generatingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 42,
    paddingHorizontal: STUDENT_SPACING.xl,
    gap: 8,
  },
  generatingTitle: { fontSize: 16, fontWeight: '800', color: STUDENT.text },
  generatingText: { fontSize: 13, color: STUDENT.textMuted, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: STUDENT_SPACING.lg, gap: 14 },
  compactHeader: {
    borderBottomWidth: 1,
    borderBottomColor: STUDENT.surfaceBorder,
    overflow: 'hidden',
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: STUDENT_SPACING.lg,
    paddingVertical: STUDENT_SPACING.sm,
    gap: STUDENT_SPACING.sm,
  },
  compactBackBtn: {
    width: 40,
    height: 40,
    borderRadius: STUDENT_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  compactHeaderTitle: {
    flex: 1,
    ...STUDENT_TYPO.body,
    fontWeight: '800',
    color: STUDENT.textOnPrimary,
  },
  compactHeaderSpacer: { width: 40 },
  paramsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: STUDENT_SPACING.md,
    backgroundColor: STUDENT.surface,
    borderRadius: STUDENT_RADIUS.lg,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    paddingHorizontal: STUDENT_SPACING.lg,
    paddingVertical: 14,
  },
  paramsSummaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paramsSummaryText: { flex: 1, minWidth: 0 },
  paramsSummaryTitle: {
    ...STUDENT_TYPO.body,
    fontWeight: '700',
    color: STUDENT.text,
  },
  paramsSummaryMeta: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: STUDENT.surfaceBorder,
  },
  sectionAccent: { width: 4 },
  sectionHeaderText: { flex: 1, paddingHorizontal: STUDENT_SPACING.lg, paddingVertical: 14 },
  sectionTitle: { ...STUDENT_TYPO.body, fontWeight: '800', color: STUDENT.text },
  sectionSubtitle: { ...STUDENT_TYPO.caption, color: STUDENT.textMuted, marginTop: 2 },
  sectionBody: { padding: STUDENT_SPACING.lg, gap: 14 },
  fieldBlock: { gap: STUDENT_SPACING.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: STUDENT_SPACING.sm },
  fieldIconWrap: {
    width: 28,
    height: 28,
    borderRadius: STUDENT_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { flex: 1, ...STUDENT_TYPO.body, fontWeight: '700', color: STUDENT.textSecondary },
  fieldSpinner: { marginLeft: 'auto' },
  required: { color: STUDENT.danger },
  dropdownTrigger: {
    minHeight: 52,
    borderRadius: STUDENT_RADIUS.md,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    backgroundColor: STUDENT.surfaceHover,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dropdownTriggerDisabled: { opacity: 0.55, backgroundColor: STUDENT.bgAccent },
  dropdownValue: { flex: 1, ...STUDENT_TYPO.body, fontWeight: '600', color: STUDENT.text },
  dropdownPlaceholder: { color: STUDENT.navInactive, fontWeight: '500' },
  lockedField: {
    minHeight: 52,
    borderRadius: STUDENT_RADIUS.md,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    backgroundColor: STUDENT.surfaceHover,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedValue: { ...STUDENT_TYPO.body, fontWeight: '700', color: STUDENT.text },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: STUDENT.surfaceBorder,
    paddingHorizontal: STUDENT_SPACING.sm,
    paddingVertical: 4,
    borderRadius: STUDENT_RADIUS.sm,
  },
  lockedBadgeText: { ...STUDENT_TYPO.label, color: STUDENT.textMuted },
  textInput: {
    minHeight: 52,
    borderRadius: STUDENT_RADIUS.md,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    backgroundColor: STUDENT.surfaceHover,
    paddingHorizontal: 14,
    fontSize: 15,
    color: STUDENT.text,
  },
  textArea: { minHeight: 110, paddingTop: 14, paddingBottom: 14 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: STUDENT_SPACING.sm,
    backgroundColor: STUDENT.accentSoft,
    borderRadius: STUDENT_RADIUS.md,
    padding: STUDENT_SPACING.md,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
  },
  infoBannerText: { flex: 1, ...STUDENT_TYPO.caption, color: STUDENT.accent, lineHeight: 18 },
  emptyResult: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: STUDENT_SPACING.xxl,
  },
  emptyResultIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: STUDENT.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyResultTitle: { marginTop: STUDENT_SPACING.md, ...STUDENT_TYPO.body, fontWeight: '700', color: STUDENT.textMuted },
  emptyResultText: { marginTop: 4, ...STUDENT_TYPO.caption, color: STUDENT.navInactive, textAlign: 'center' },
  footer: {
    paddingHorizontal: STUDENT_SPACING.lg,
    paddingTop: 10,
    paddingBottom: STUDENT_SPACING.md,
    backgroundColor: STUDENT.bg,
    borderTopWidth: 1,
    borderTopColor: STUDENT.surfaceBorder,
  },
  generateBtn: { borderRadius: STUDENT_RADIUS.lg, overflow: 'hidden' },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: STUDENT_SPACING.sm,
    paddingVertical: STUDENT_SPACING.lg,
  },
  generateBtnText: { fontSize: 16, fontWeight: '800', color: STUDENT.textOnPrimary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: STUDENT.surface,
    borderTopLeftRadius: STUDENT_RADIUS.xxl,
    borderTopRightRadius: STUDENT_RADIUS.xxl,
    maxHeight: '70%',
    paddingBottom: STUDENT_SPACING.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.navInactive,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: STUDENT_SPACING.md,
  },
  modalTitle: {
    ...STUDENT_TYPO.section,
    fontSize: 18,
    color: STUDENT.text,
    paddingHorizontal: STUDENT_SPACING.xl,
    marginBottom: STUDENT_SPACING.sm,
  },
  modalList: { maxHeight: 360 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: STUDENT_SPACING.xl,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: STUDENT.surfaceBorder,
  },
  modalItemSelected: { backgroundColor: STUDENT.surfaceHover },
  modalItemText: { fontSize: 16, color: STUDENT.textSecondary, flex: 1, paddingRight: STUDENT_SPACING.md },
  modalItemTextSelected: { fontWeight: '700', color: STUDENT.text },
  modalCloseBtn: {
    marginHorizontal: STUDENT_SPACING.xl,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: STUDENT_RADIUS.md,
    backgroundColor: STUDENT.bgAccent,
    alignItems: 'center',
  },
  modalCloseText: { ...STUDENT_TYPO.body, fontWeight: '700', color: STUDENT.textSecondary },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: STUDENT_SPACING.xxxl },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: STUDENT.bgAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: STUDENT_SPACING.lg,
  },
  errorTitle: { ...STUDENT_TYPO.section, fontSize: 20, color: STUDENT.text },
  errorSubtitle: { ...STUDENT_TYPO.caption, color: STUDENT.textMuted, marginTop: STUDENT_SPACING.sm, textAlign: 'center' },
  errorButton: {
    marginTop: STUDENT_SPACING.xxl,
    backgroundColor: STUDENT.accent,
    paddingHorizontal: STUDENT_SPACING.xxl,
    paddingVertical: STUDENT_SPACING.md,
    borderRadius: STUDENT_RADIUS.md,
  },
  errorButtonText: { color: STUDENT.textOnPrimary, ...STUDENT_TYPO.body, fontWeight: '700' },
});

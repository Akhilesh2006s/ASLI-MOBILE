import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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
import {
  parseStudentDashboardTab,
  useStudentDashboardBack,
} from '../../../src/hooks/useBackNavigation';
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
} from '../../../src/hooks/useCurriculumCascade';
import StudentScreenHeader from '../../../src/components/student/StudentScreenHeader';
import GlassCard from '../../../src/components/student/GlassCard';
import AiToolContentRenderer from '../../../src/components/ai-tools/AiToolContentRenderer';
import AiToolFieldIcon from '../../../src/components/ai-tools/AiToolFieldIcon';
import AiToolPremiumIcon from '../../../src/components/ai-tools/AiToolPremiumIcon';
import AiGenerateIcon from '../../../src/components/ai-tools/AiGenerateIcon';
import { getAiToolIonicon } from '../../../src/lib/ai-tool-icons';
import {
  aiToolTabletPageStyles,
  aiToolTabletStyles,
  useAiToolTabletLayout,
} from '../../../src/components/ai-tools/ai-tool-tablet-layout';
import {
  useAiToolOutputScroll,
  useQueueAiToolScrollOnGenerate,
} from '../../../src/components/ai-tools/useAiToolOutputScroll';
import {
  validateAiToolForm,
  executeStudentAiToolGenerateWithFallback,
  storeAiToolSuccessPayload,
  validateActivityToolDisplay,
  validateStudyGuideToolDisplay,
  type AiToolGenerationMeta,
} from '../../../src/lib/ai-tool-generate';
import {
  buildAiToolContentRenderKey,
} from '../../../src/lib/ai-tool-rotation-label';
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
  tabletUi,
}: {
  summary: string;
  accent: string;
  expanded: boolean;
  onToggle: () => void;
  tabletUi?: boolean;
}) {
  return (
    <Pressable
      style={[styles.paramsSummary, tabletUi && aiToolTabletPageStyles.paramsSummary]}
      onPress={onToggle}
    >
      <View style={[styles.paramsSummaryIcon, { backgroundColor: `${accent}18` }]}>
        <AiToolFieldIcon name="options-outline" accent={accent} size={36} />
      </View>
      <View style={styles.paramsSummaryText}>
        <Text style={[styles.paramsSummaryTitle, tabletUi && aiToolTabletPageStyles.paramsSummaryTitle]}>
          {expanded ? 'Hide parameters' : 'Show parameters'}
        </Text>
        {!expanded && summary ? (
          <Text
            style={[styles.paramsSummaryMeta, tabletUi && aiToolTabletPageStyles.paramsSummaryMeta]}
            numberOfLines={tabletUi ? 2 : 1}
          >
            {summary}
          </Text>
        ) : null}
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={tabletUi ? 20 : 18} color={STUDENT.textMuted} />
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
  tabletUi,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  children: ReactNode;
  tabletUi?: boolean;
}) {
  return (
    <GlassCard padding={0}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: accent }]} />
        <View style={[styles.sectionHeaderText, tabletUi && aiToolTabletPageStyles.sectionHeaderText]}>
          <Text style={[styles.sectionTitle, tabletUi && aiToolTabletPageStyles.sectionTitle]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.sectionSubtitle, tabletUi && aiToolTabletPageStyles.sectionSubtitle]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.sectionBody, tabletUi && aiToolTabletPageStyles.sectionBody]}>{children}</View>
    </GlassCard>
  );
}

export default function StudentToolPage() {
  const { toolType, returnTab: returnTabRaw } = useLocalSearchParams<{
    toolType: string;
    returnTab?: string;
  }>();
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [rawGeneratedContent, setRawGeneratedContent] = useState<unknown>(null);
  const [responseMeta, setResponseMeta] = useState<AiToolGenerationMeta | null>(null);
  const [fallbackEmptyMessage, setFallbackEmptyMessage] = useState('');
  const [fromAiFailure, setFromAiFailure] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [availableNCERTTopics, setAvailableNCERTTopics] = useState<string[]>([]);
  const [schoolBoardName, setSchoolBoardName] = useState('CBSE');
  const [isAsliPrepExclusive, setIsAsliPrepExclusive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownState | null>(null);
  const [paramsExpanded, setParamsExpanded] = useState(true);
  const scrollY = useSharedValue(0);
  const { isTablet, useSplitLayout } = useAiToolTabletLayout();
  const { scrollRef, onOutputLayout, queueScrollToOutput, resetOutputScroll } =
    useAiToolOutputScroll(isTablet);

  const configKey = toolType ? resolveStudentToolConfigKey(toolType) : '';
  const config = configKey ? getStudentToolConfig(configKey) || getStudentToolConfig(toolType || '') : null;
  const apiToolType = toolType ? resolveStudentAiApiToolType(toolType) : '';
  const contentRenderKey = useMemo(
    () => buildAiToolContentRenderKey(toolType || '', generatedContent, responseMeta),
    [toolType, generatedContent, responseMeta]
  );
  const isReadingPractice =
    toolType === READING_PRACTICE_TOOL_ID || toolType === 'story-passage-creator';
  const isSmartStudyGuide = toolType === 'smart-study-guide-generator';
  const accent = isSmartStudyGuide ? '#4f46e5' : config?.color || '#3b82f6';

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

  useQueueAiToolScrollOnGenerate(
    generatedContent,
    isGenerating,
    isTablet,
    queueScrollToOutput,
    fallbackEmptyMessage,
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    maxHeight: isTablet
      ? 140
      : interpolate(scrollY.value, [0, HEADER_COLLAPSE_DISTANCE], [140, 0], Extrapolation.CLAMP),
    opacity: isTablet
      ? 1
      : interpolate(scrollY.value, [0, HEADER_COLLAPSE_DISTANCE * 0.65], [1, 0], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }));

  const compactHeaderAnimatedStyle = useAnimatedStyle(() => ({
    maxHeight: isTablet
      ? 0
      : interpolate(
          scrollY.value,
          [HEADER_COLLAPSE_DISTANCE * 0.4, HEADER_COLLAPSE_DISTANCE],
          [0, 52],
          Extrapolation.CLAMP
        ),
    opacity: isTablet
      ? 0
      : interpolate(
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
    if (!formParams.gradeLevel) return [];
    const raw = cascade.subjects;
    if (cascade.loadingSubjects && raw.length === 0) return [];
    return raw.length > 0 ? raw : [];
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

  const returnTab = parseStudentDashboardTab(
    typeof returnTabRaw === 'string' ? returnTabRaw : Array.isArray(returnTabRaw) ? returnTabRaw[0] : undefined,
  );
  const goBack = useStudentDashboardBack(returnTab);

  useEffect(() => {
    fetchUser();
  }, []);

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
        return isReadingPractice ? 'English, Hindi, or Telugu only' : 'No subjects available';
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

  const showInlineOutputMessage = useCallback(
    (message: string) => {
      resetOutputScroll();
      setGeneratedContent('');
      setRawGeneratedContent(null);
      setResponseMeta(null);
      setFromAiFailure(false);
      setFallbackEmptyMessage(message);
      queueScrollToOutput();
    },
    [resetOutputScroll, queueScrollToOutput],
  );

  const handleGenerate = async () => {
    if (!config) return;

    const validationError = validateAiToolForm({
      config,
      formParams: { ...formParams, board: selectedBoard },
      isReadingPractice,
      requireBoard: true,
    });
    if (validationError) {
      showInlineOutputMessage(validationError);
      return;
    }

    setIsGenerating(true);
    resetOutputScroll();
    setGeneratedContent('');
    setRawGeneratedContent(null);
    setResponseMeta(null);
    setFallbackEmptyMessage('');
    setFromAiFailure(false);

    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        showInlineOutputMessage('Please sign in again.');
        return;
      }

      const result = await executeStudentAiToolGenerateWithFallback({
        apiBaseUrl: API_BASE_URL,
        token,
        apiToolType,
        formParams,
        selectedBoard,
        curriculumBoard: schoolBoardName,
        mapGradeLevel: mapGradeLevelForIitBoard,
      });

      if (!result.ok) {
        showInlineOutputMessage(result.fallbackMessage);
        return;
      }

      const stored = storeAiToolSuccessPayload(toolType || '', result.content, result.rawContent, 'student');
      const activityDisplayError = validateActivityToolDisplay(
        toolType || '',
        stored.generatedContent,
        stored.rawGeneratedContent,
        'student',
      );
      const studyGuideDisplayError = validateStudyGuideToolDisplay(
        toolType || '',
        stored.generatedContent,
        stored.rawGeneratedContent,
      );
      const displayError = activityDisplayError || studyGuideDisplayError;
      if (displayError) {
        showInlineOutputMessage(displayError);
        return;
      }

      setResponseMeta(result.metadata);
      setFromAiFailure(result.fromAiFailure);
      setParamsExpanded(false);
      setGeneratedContent(stored.generatedContent);
      setRawGeneratedContent(stored.rawGeneratedContent);
    } catch (error: any) {
      console.error('Generation error:', error);
      showInlineOutputMessage(String(error?.message || 'Network error. Please try again.'));
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
            <AiToolFieldIcon name={icon} accent={accent} />
          </View>
          <Text style={[styles.fieldLabel, isTablet && aiToolTabletPageStyles.fieldLabel]}>
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
            style={[styles.dropdownValue, isPlaceholder && styles.dropdownPlaceholder, isTablet && aiToolTabletPageStyles.dropdownValue]}
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
              <AiToolFieldIcon name="layers-outline" accent={accent} />
            </View>
            <Text style={[styles.fieldLabel, isTablet && aiToolTabletPageStyles.fieldLabel]}>Class</Text>
          </View>
          <View style={styles.lockedField}>
            <Text style={[styles.lockedValue, isTablet && aiToolTabletPageStyles.lockedValue]}>{assignedGradeLevel}</Text>
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
              <AiToolFieldIcon name={FIELD_ICONS[field.name] || 'create-outline'} accent={accent} />
            </View>
            <Text style={[styles.fieldLabel, isTablet && aiToolTabletPageStyles.fieldLabel]}>
              {field.label.replace(' *', '')}
              {field.required ? <Text style={styles.required}> *</Text> : null}
          </Text>
          </View>
          <TextInput
            style={[styles.textArea, styles.textInput, isTablet && aiToolTabletPageStyles.textInput]}
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
            <AiToolFieldIcon name={FIELD_ICONS[field.name] || 'options-outline'} accent={accent} />
          </View>
          <Text style={[styles.fieldLabel, isTablet && aiToolTabletPageStyles.fieldLabel]}>
            {field.label.replace(' *', '')}
            {field.required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        </View>
        <TextInput
          style={[styles.textInput, isTablet && aiToolTabletPageStyles.textInput]}
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
        <StudentScreenHeader title="Tool not found" onBack={goBack} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={STUDENT.danger} />
          </View>
          <Text style={styles.errorTitle}>Tool not found</Text>
          <Text style={styles.errorSubtitle}>This AI tool is not available on mobile yet.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={goBack}>
            <Text style={styles.errorButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const parameterTitle = isSmartStudyGuide ? 'Customize your premium guide' : 'Tool Parameters';
  const pageBgStyle = isSmartStudyGuide ? styles.containerPremium : styles.container;

  const formPanel = (
    <>
      {showCollapsedParams ? (
        <ParametersSummaryBar
          summary={paramsSummary}
          accent={accent}
          expanded={paramsExpanded}
          onToggle={() => setParamsExpanded((prev) => !prev)}
          tabletUi={isTablet}
        />
      ) : null}

      {showParameterForms ? (
        <>
          <FormSection
            title={parameterTitle}
            subtitle={isSmartStudyGuide ? 'Board, class, subject, topic and sub-topic' : 'Board and class details'}
            accent={accent}
            tabletUi={isTablet}
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
                <Text style={[styles.infoBannerText, isTablet && aiToolTabletPageStyles.infoBannerText]}>
                  English, Hindi, and Telugu subjects only for this tool.
                </Text>
              </View>
            ) : null}
          </FormSection>

          {topicFields.length > 0 ? (
            <FormSection
              title="Topic details"
              subtitle="Pick chapter and sub-topic from syllabus"
              accent={accent}
              tabletUi={isTablet}
            >
              {topicFields.map(renderField)}
            </FormSection>
          ) : null}

          {extraFields.length > 0 ? (
            <FormSection title="Options" subtitle="Customize your output" accent={accent} tabletUi={isTablet}>
              {extraFields.map(renderField)}
            </FormSection>
          ) : null}
        </>
      ) : null}
    </>
  );

  const outputPanel = (
    <View
      style={styles.outputSection}
      collapsable={false}
      onLayout={
        !isGenerating && (generatedContent || fallbackEmptyMessage) ? onOutputLayout : undefined
      }
    >
      {isGenerating ? (
        <View style={styles.generatingBox}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={[styles.generatingTitle, isTablet && aiToolTabletPageStyles.generatingTitle]}>Generating Content...</Text>
          <Text style={[styles.generatingText, isTablet && aiToolTabletPageStyles.generatingText]}>Please wait while we prepare your content</Text>
        </View>
      ) : generatedContent ? (
        <View style={styles.outputWrap} collapsable={false}>
          <AiToolContentRenderer
            key={contentRenderKey}
            toolType={toolType || ''}
            content={generatedContent}
            rawContent={rawGeneratedContent}
            accent={accent}
            variant="student"
          />
        </View>
      ) : (
        <View style={styles.emptyResult}>
          <AiToolPremiumIcon
            name={
              fallbackEmptyMessage
                ? 'alert-circle'
                : getAiToolIonicon(toolType || '')
            }
            color={fallbackEmptyMessage ? STUDENT.danger : accent}
            size={64}
            iconSize={28}
          />
          <Text
            style={[
              styles.emptyResultTitle,
              isTablet && aiToolTabletPageStyles.emptyResultTitle,
              fallbackEmptyMessage ? styles.emptyResultTitleError : null,
            ]}
          >
            {fallbackEmptyMessage || 'Generated content will appear here'}
          </Text>
          {!fallbackEmptyMessage ? (
            <Text style={[styles.emptyResultText, isTablet && aiToolTabletPageStyles.emptyResultText]}>
              Choose tool parameters and tap Generate.
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={pageBgStyle} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <Animated.View style={headerAnimatedStyle}>
        <StudentScreenHeader
          title={config.name}
          subtitle={config.description}
          onBack={goBack}
          tabletUi={isTablet}
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
            onPress={goBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={STUDENT.textOnPrimary} />
          </Pressable>
          <Text style={[styles.compactHeaderTitle, isTablet && aiToolTabletPageStyles.compactHeaderTitle]} numberOfLines={1}>
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
        {useSplitLayout ? (
          <View style={aiToolTabletStyles.tabletSplit}>
            <ScrollView
              style={aiToolTabletStyles.tabletFormPane}
              contentContainerStyle={aiToolTabletStyles.tabletPaneContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {formPanel}
            </ScrollView>
            <ScrollView
              style={aiToolTabletStyles.tabletOutputPane}
              contentContainerStyle={aiToolTabletStyles.tabletPaneContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {outputPanel}
            </ScrollView>
          </View>
        ) : (
        <AnimatedScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && aiToolTabletPageStyles.scrollContent,
            { paddingBottom: 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {formPanel}
          {outputPanel}
        </AnimatedScrollView>
        )}

        <View style={[styles.footer, isTablet && aiToolTabletPageStyles.footer]}>
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
              style={[styles.generateBtnGradient, isTablet && aiToolTabletPageStyles.generateBtnGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isGenerating ? (
                <>
              <ActivityIndicator size="small" color={STUDENT.textOnPrimary} />
                  <Text style={[styles.generateBtnText, isTablet && aiToolTabletPageStyles.generateBtnText]}>Generating...</Text>
                </>
            ) : (
              <>
                <AiGenerateIcon size={isTablet ? 22 : 20} color={STUDENT.textOnPrimary} />
                  <Text style={[styles.generateBtnText, isTablet && aiToolTabletPageStyles.generateBtnText]}>Generate with AI</Text>
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
  outputSection: { width: '100%' },
  outputWrap: { width: '100%', minHeight: 240 },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { flex: 1, ...STUDENT_TYPO.body, fontWeight: '700', color: STUDENT.textSecondary },
  fieldSpinner: { marginLeft: 'auto' },
  required: { color: STUDENT.primary },
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
  emptyResultTitle: {
    marginTop: STUDENT_SPACING.md,
    ...STUDENT_TYPO.body,
    fontWeight: '700',
    color: STUDENT.textMuted,
    textAlign: 'center',
  },
  emptyResultTitleError: { color: '#b91c1c' },
  emptyResultText: { marginTop: 4, ...STUDENT_TYPO.caption, color: STUDENT.navInactive, textAlign: 'center' },
  footer: {
    paddingHorizontal: STUDENT_SPACING.lg,
    paddingTop: 10,
    paddingBottom: STUDENT_SPACING.md,
    backgroundColor: STUDENT.bg,
    borderTopWidth: 1,
    borderTopColor: STUDENT.surfaceBorder,
  },
  generateBtn: { borderRadius: STUDENT_RADIUS.xl, overflow: 'hidden', ...STUDENT.shadow.md },
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

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Share,
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
import { formatAiToolText } from '../../../src/lib/title-case';
import * as SecureStore from 'expo-secure-store';
import {
  parseStudentDashboardTab,
  useStudentDashboardBack,
} from '../../../src/hooks/useBackNavigation';
import {
  resolveStudentAiApiToolType,
  resolveStudentToolConfigKey,
  filterSubjectsForAiTool,
  isLanguageExcludedTool,
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
import { GlassPanel, GlassSurface } from '../../../src/components/ui';
import AiToolContentRenderer from '../../../src/components/ai-tools/AiToolContentRenderer';
import AiToolFieldIcon from '../../../src/components/ai-tools/AiToolFieldIcon';
import AiToolParamsGrid from '../../../src/components/ai-tools/AiToolParamsGrid';
import AiToolPremiumIcon from '../../../src/components/ai-tools/AiToolPremiumIcon';
import AiToolResultShell from '../../../src/components/ai-tools/AiToolResultShell';
import AiToolOptionPicker from '../../../src/components/ai-tools/AiToolOptionPicker';
import AiGenerateIcon from '../../../src/components/ai-tools/AiGenerateIcon';
import * as Clipboard from 'expo-clipboard';
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
  executeStudentAiToolGenerate,
  fetchAiToolGeneratedContentFallback,
  storeAiToolSuccessPayload,
  validateActivityToolDisplay,
  validateStudyGuideToolDisplay,
  isAiToolClientValidationError,
  isAiToolInlineOnlyError,
  resolveAiToolApiInlineMessage,
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
import { AI, AI_RADIUS, AI_SHADOW, AI_SPACING, AI_TYPE } from '../../../src/theme/ai';
import { GLASS_ROW } from '../../../src/theme/glass';

function mergeSelectedIntoOptions(options: string[], selected: unknown): string[] {
  const v = typeof selected === 'string' ? selected.trim() : '';
  if (!v) return options;
  if (options.includes(v)) return options;
  return [v, ...options];
}

const HEADER_COLLAPSE_DISTANCE = 72;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

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
    <GlassPanel style={styles.formCard} radius={AI_RADIUS.lg} tone="strong" elevated>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: accent }]} />
        <View style={[styles.sectionHeaderText, tabletUi && aiToolTabletPageStyles.sectionHeaderText]}>
          <Text style={[styles.sectionTitle, tabletUi && aiToolTabletPageStyles.sectionTitle]}>
            {formatAiToolText(title)}
          </Text>
          {subtitle ? (
            <Text style={[styles.sectionSubtitle, tabletUi && aiToolTabletPageStyles.sectionSubtitle]}>
              {formatAiToolText(subtitle)}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.sectionBody, tabletUi && aiToolTabletPageStyles.sectionBody]}>{children}</View>
    </GlassPanel>
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
  const [copied, setCopied] = useState(false);
  const scrollY = useSharedValue(0);
  const { isTablet, useSplitLayout, outputBleedStyle } = useAiToolTabletLayout();
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
  const accent = AI.primary;

  const boardOptions = getAiToolBoardOptions(isAsliPrepExclusive, schoolBoardName);
  const selectedBoard = formParams.board || getDefaultAiToolBoard(isAsliPrepExclusive, schoolBoardName);

  const paramItems = useMemo(
    () => [
      { icon: 'school-outline' as const, label: 'Board', value: String(selectedBoard || '') },
      { icon: 'people-outline' as const, label: 'Class', value: String(formParams.gradeLevel || '') },
      { icon: 'book-outline' as const, label: 'Subject', value: String(formParams.subject || '') },
      { icon: 'document-text-outline' as const, label: 'Chapter', value: String(formParams.topic || formParams.chapter || '') },
      { icon: 'list-outline' as const, label: 'Subtopic', value: String(formParams.subTopic || '') },
    ],
    [selectedBoard, formParams]
  );

  const showCollapsedParams = !!generatedContent && !isGenerating;
  const showParameterForms = !showCollapsedParams;

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
    const HIDDEN_EXTRA = new Set([
      'questionCount',
      'difficulty',
      'duration',
      'length',
      'countMcq',
      'countVsaq',
      'countSaq',
      'countLaq',
      'countFib',
    ]);
    const curriculum: StudentToolFieldConfig[] = [];
    const topic: StudentToolFieldConfig[] = [];
    const extra: StudentToolFieldConfig[] = [];
    for (const field of config.fields) {
      if (HIDDEN_EXTRA.has(field.name)) continue;
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
    const sub = formParams.subject;
    if (!sub) return;
    const subStr = String(sub);
    const shouldClear =
      (isReadingPractice && !isStoryPassageLanguageSubject(subStr)) ||
      (isLanguageExcludedTool(apiToolType) && isStoryPassageLanguageSubject(subStr));
    if (!shouldClear) return;
    setFormParams((prev) => {
      const next = { ...prev };
      delete next.subject;
      delete next.topic;
      delete next.subTopic;
      return next;
    });
  }, [isReadingPractice, apiToolType, formParams.subject]);

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
        if (isReadingPractice) return 'English, Hindi, or Telugu only';
        if (isLanguageExcludedTool(apiToolType)) return 'Not available for English, Hindi, or Telugu';
        return 'No subjects available';
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

  useEffect(() => {
    setFallbackEmptyMessage('');
  }, [
    formParams.board,
    formParams.gradeLevel,
    formParams.subject,
    formParams.topic,
    formParams.subTopic,
  ]);

  const handleGenerate = async () => {
    if (!config) return;

    const validationError = validateAiToolForm({
      config,
      formParams: { ...formParams, board: selectedBoard },
      toolType: apiToolType,
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

      const result = await executeStudentAiToolGenerate({
        apiBaseUrl: API_BASE_URL,
        token,
        apiToolType,
        formParams,
        selectedBoard,
        mapGradeLevel: mapGradeLevelForIitBoard,
      });

      if (!result.ok) {
        if (isAiToolInlineOnlyError(result.code)) {
          showInlineOutputMessage(
            resolveAiToolApiInlineMessage({ message: result.message, code: result.code }, config?.name),
          );
          return;
        }
        throw new Error(result.message || 'Content fetch failed');
      }

      const stored = storeAiToolSuccessPayload(apiToolType, result.content, result.rawContent, 'student');
      const activityDisplayError = validateActivityToolDisplay(
        apiToolType,
        stored.generatedContent,
        stored.rawGeneratedContent,
        'student',
      );
      const studyGuideDisplayError = validateStudyGuideToolDisplay(
        apiToolType,
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
      setGeneratedContent(stored.generatedContent);
      setRawGeneratedContent(stored.rawGeneratedContent);
    } catch (error: any) {
      console.error('Generation error:', error);
      const errMsg = String(error?.message || 'Network error. Please try again.');
      if (isAiToolClientValidationError(errMsg) || /AI_TOOL_DATA_NOT_FOUND/i.test(errMsg)) {
        showInlineOutputMessage(errMsg);
        return;
      }

      try {
        const selectedClass = formParams.gradeLevel;
        const selectedSubject = formParams.subject || formParams.subjects;
        if (!selectedClass || !selectedSubject) {
          throw new Error('Missing class or subject for fallback');
        }
        const mappedTopic =
          formParams.topic ||
          formParams.concept ||
          formParams.chapter ||
          formParams.projectTopic ||
          '';
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) throw new Error('Please sign in again.');

        const fallbackResult = await fetchAiToolGeneratedContentFallback({
          apiBaseUrl: API_BASE_URL,
          token,
          classLabel: String(selectedClass),
          subject: String(selectedSubject),
          topic: String(mappedTopic),
          subTopic: String(formParams.subTopic || ''),
          toolType: apiToolType,
        });

        if (!fallbackResult.ok) {
          if (isAiToolInlineOnlyError(fallbackResult.code)) {
            showInlineOutputMessage(fallbackResult.fallbackMessage);
            return;
          }
          showInlineOutputMessage(`${errMsg} ${fallbackResult.fallbackMessage}`.trim());
          return;
        }

        const stored = storeAiToolSuccessPayload(apiToolType, fallbackResult.content, fallbackResult.rawContent, 'student');
        const activityDisplayError = validateActivityToolDisplay(
          apiToolType,
          stored.generatedContent,
          stored.rawGeneratedContent,
          'student',
        );
        const studyGuideDisplayError = validateStudyGuideToolDisplay(
          apiToolType,
          stored.generatedContent,
          stored.rawGeneratedContent,
        );
        const displayError = activityDisplayError || studyGuideDisplayError;
        if (displayError) {
          showInlineOutputMessage(displayError);
          return;
        }

        setResponseMeta(fallbackResult.metadata);
        setFromAiFailure(false);
        setGeneratedContent(stored.generatedContent);
        setRawGeneratedContent(stored.rawGeneratedContent);
      } catch (fallbackError: any) {
        const fe = String(fallbackError?.message || 'Fallback lookup failed');
        showInlineOutputMessage(`${errMsg} ${fe}`.trim());
      }
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
              {formatAiToolText(field.label.replace(' *', ''))}
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
            {formatAiToolText(field.label.replace(' *', ''))}
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

  const parameterTitle = 'Choose what to generate';
  const pageBgStyle = styles.container;

  const formPanel = (
    <>
      {showCollapsedParams ? (
        <AiToolParamsGrid items={paramItems} accent={accent} tabletUi={isTablet} />
      ) : null}

      {showParameterForms ? (
        <>
          <FormSection
            title={parameterTitle}
              subtitle="Start with your board and class details"
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
            {isLanguageExcludedTool(apiToolType) ? (
              <View style={[styles.infoBanner, styles.infoBannerWarning]}>
                <Ionicons name="alert-circle" size={18} color="#b45309" />
                <Text style={[styles.infoBannerText, styles.infoBannerWarningText, isTablet && aiToolTabletPageStyles.infoBannerText]}>
                  Not available for English, Hindi, or Telugu subjects.
                </Text>
              </View>
            ) : null}
          </FormSection>

          {topicFields.length > 0 || extraFields.length > 0 ? (
            <FormSection
              title="Topic details"
              subtitle="Pick chapter and sub-topic from syllabus"
              accent={accent}
              tabletUi={isTablet}
            >
              {topicFields.map(renderField)}
              {extraFields.map(renderField)}
            </FormSection>
          ) : null}
        </>
      ) : null}
    </>
  );

  const outputPanel = (
    <View
      style={[styles.outputSection, outputBleedStyle]}
      collapsable={false}
      onLayout={
        !isGenerating && (generatedContent || fallbackEmptyMessage) ? onOutputLayout : undefined
      }
    >
      <AiToolResultShell
        toolType={apiToolType || toolType}
        toolName={config?.name || 'AI Tool'}
        toolDescription={config?.description}
        accent={accent}
        variant="student"
        meta={{
          board: selectedBoard || formParams.board || '',
          classLabel: String(formParams.gradeLevel || assignedGradeLevel || ''),
          subject: String(formParams.subject || formParams.subjects || ''),
          chapter: String(formParams.topic || formParams.chapter || formParams.concept || ''),
          subtopic: String(formParams.subTopic || ''),
        }}
        isLoading={isGenerating}
        citations={
          generatedContent &&
          Array.isArray(responseMeta?.citations) &&
          responseMeta.citations.length > 0 ? (
            <View style={styles.citationsBox}>
              <Text style={styles.citationsTitle}>Top Citations</Text>
              {responseMeta.citations.slice(0, 3).map((c) => (
                <Text key={`${c.index}-${c.chapter}`} style={styles.citationLine}>
                  [{c.index}] {c.subject} / {c.chapter} ({c.score})
                </Text>
              ))}
            </View>
          ) : null
        }
        actions={
          generatedContent ? (
            <View style={styles.resultActions}>
              <Pressable
                style={styles.actionBtn}
                accessibilityRole="button"
                accessibilityLabel={copied ? 'Content copied' : 'Copy generated content'}
                onPress={async () => {
                  await Clipboard.setStringAsync(generatedContent);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={AI.textSecondary} />
                <Text style={styles.actionBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                accessibilityRole="button"
                accessibilityLabel="Share generated content"
                onPress={() =>
                  Share.share({
                    title: `${config?.name || 'AI Tool'} | ASLILEARN AI`,
                    message: generatedContent,
                  })
                }
              >
                <Ionicons name="share-social-outline" size={16} color={AI.textSecondary} />
                <Text style={styles.actionBtnText}>Share</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                accessibilityRole="button"
                accessibilityLabel="Regenerate content"
                onPress={handleGenerate}
              >
                <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnPrimaryText}>Regenerate</Text>
              </Pressable>
            </View>
          ) : null
        }
        empty={
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
              {fallbackEmptyMessage || 'Fill in the form and generate to see your result'}
            </Text>
            {!fallbackEmptyMessage ? (
              <Text style={[styles.emptyResultText, isTablet && aiToolTabletPageStyles.emptyResultText]}>
                Choose tool parameters and tap Generate.
              </Text>
            ) : null}
          </View>
        }
      >
        {generatedContent ? (
          <View style={styles.outputWrap} collapsable={false}>
            <AiToolContentRenderer
              key={contentRenderKey}
              toolType={apiToolType}
              content={generatedContent}
              rawContent={rawGeneratedContent}
              accent={accent}
              variant="student"
            />
          </View>
        ) : null}
      </AiToolResultShell>
    </View>
  );

  return (
    <SafeAreaView style={pageBgStyle} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <Animated.View style={headerAnimatedStyle}>
        <StudentScreenHeader
          title={formatAiToolText(config.name)}
          subtitle={formatAiToolText(config.description)}
          onBack={goBack}
          tabletUi={isTablet}
          variant="ai"
        />
      </Animated.View>

      <Animated.View style={[styles.compactHeader, compactHeaderAnimatedStyle]}>
        <GlassSurface intensity={55} tone="medium" />
        <View style={styles.compactHeaderRow}>
          <Pressable
            style={styles.compactBackBtn}
            onPress={goBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={AI.primary} />
          </Pressable>
          <Text style={[styles.compactHeaderTitle, isTablet && aiToolTabletPageStyles.compactHeaderTitle]} numberOfLines={1}>
            {formatAiToolText(config.name)}
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
              colors={[AI.primary, AI.primaryPressed]}
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

      <AiToolOptionPicker
        visible={!!activeDropdown}
        title={activeDropdown?.title || ''}
        options={activeDropdown?.options || []}
        value={activeDropdown?.value}
        accent={accent}
        onClose={() => setActiveDropdown(null)}
        onSelect={(option) => {
          if (activeDropdown) handleInputChange(activeDropdown.fieldName, option);
          setActiveDropdown(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  containerPremium: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  outputSection: { alignSelf: 'stretch' },
  outputWrap: { width: '100%', minHeight: 240 },
  resultActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: AI_SPACING.sm,
  },
  actionBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    backgroundColor: GLASS_ROW.fillStrong,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionBtnText: {
    ...AI_TYPE.caption,
    color: AI.textSecondary,
  },
  actionBtnPrimary: { borderColor: AI.primary, backgroundColor: AI.primary },
  actionBtnPrimaryText: { ...AI_TYPE.caption, color: '#FFFFFF' },
  citationsBox: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    backgroundColor: GLASS_ROW.fillSoft,
    padding: 8,
    maxHeight: 96,
  },
  citationsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 4,
  },
  citationLine: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
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
  scrollContent: { padding: AI_SPACING.lg, gap: AI_SPACING.md },
  formCard: {
    overflow: 'hidden',
    borderRadius: AI_RADIUS.lg,
    borderWidth: 1,
    borderColor: AI.border,
    ...AI_SHADOW,
  },
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
    borderWidth: 1,
    borderColor: AI.primaryBorder,
    backgroundColor: AI.surface,
  },
  compactHeaderTitle: {
    flex: 1,
    ...STUDENT_TYPO.body,
    fontWeight: '800',
    color: AI.text,
  },
  compactHeaderSpacer: { width: 40 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: AI.border,
  },
  sectionAccent: { width: 4 },
  sectionHeaderText: { flex: 1, paddingHorizontal: AI_SPACING.lg, paddingVertical: AI_SPACING.md },
  sectionTitle: { ...AI_TYPE.title, color: AI.text },
  sectionSubtitle: { ...AI_TYPE.caption, color: AI.textMuted, marginTop: 3 },
  sectionBody: { padding: AI_SPACING.lg, gap: AI_SPACING.md },
  fieldBlock: { gap: STUDENT_SPACING.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: STUDENT_SPACING.sm },
  fieldIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { flex: 1, ...AI_TYPE.body, fontWeight: '700', color: AI.textSecondary },
  fieldSpinner: { marginLeft: 'auto' },
  required: { color: AI.orange },
  dropdownTrigger: {
    minHeight: 52,
    borderRadius: AI_RADIUS.md,
    borderWidth: 1,
    borderColor: AI.border,
    backgroundColor: AI.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dropdownTriggerDisabled: { opacity: 0.55, backgroundColor: AI.surfaceMuted },
  dropdownValue: { flex: 1, ...AI_TYPE.body, fontWeight: '600', color: AI.text },
  dropdownPlaceholder: { color: AI.textMuted, fontWeight: '500' },
  lockedField: {
    minHeight: 52,
    borderRadius: AI_RADIUS.md,
    borderWidth: 1,
    borderColor: AI.border,
    backgroundColor: AI.surface,
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
    backgroundColor: 'rgba(255,255,255,0.36)',
    paddingHorizontal: 14,
    ...AI_TYPE.body,
    color: AI.text,
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
  infoBannerWarning: {
    backgroundColor: 'rgba(255,251,235,0.55)',
    borderColor: '#fcd34d',
  },
  infoBannerWarningText: { color: '#92400e' },
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
    backgroundColor: 'rgba(255,255,255,0.48)',
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
    // Transparent so the app background artwork shows through.
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: AI.border,
  },
  generateBtn: { borderRadius: AI_RADIUS.md, overflow: 'hidden', ...AI_SHADOW },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: STUDENT_SPACING.sm,
    minHeight: 56,
    paddingVertical: AI_SPACING.md,
  },
  generateBtnText: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: '#FFFFFF' },
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

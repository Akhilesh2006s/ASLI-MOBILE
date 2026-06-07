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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useBackNavigation } from '../../../src/hooks/useBackNavigation';
import {
  filterSubjectsForAiTool,
  isStoryPassageLanguageSubject,
  isStoryLanguageTool,
} from '../../../src/lib/student-ai-tools';
import {
  getTeacherToolConfig,
  isTeacherToolType,
  CLASS_OPTIONS,
  type TeacherToolFieldConfig,
} from '../../../src/lib/teacher-ai-tool-configs';
import { stripStructuredAiToolMetadata } from '../../../src/lib/strip-ai-tool-metadata';
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
import teacherService, { asArray } from '../../../src/services/api/teacherService';
import {
  TEACHER,
  TEACHER_RADIUS,
  TEACHER_SPACING,
  TEACHER_TYPO,
} from '../../../src/theme/teacher';

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
  questionType: 'help-circle-outline',
  length: 'resize-outline',
  date: 'calendar-outline',
  timeSlots: 'time-outline',
  className: 'people-outline',
};

type DropdownState = {
  fieldName: string;
  title: string;
  options: string[];
  value: string;
  disabled: boolean;
};

function normalizeSubjectName(value: string) {
  let compact = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (compact === 'maths') return 'mathematics';
  if (compact === 'socialscience' || compact === 'socialstudies' || compact === 'sst') return 'socialscience';
  if (compact.startsWith('biology')) return 'biology';
  if (compact.startsWith('physics')) return 'physics';
  if (compact.startsWith('chemistry')) return 'chemistry';
  if (compact.startsWith('math')) return 'mathematics';
  return compact;
}

function uniquePreserveOrder(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = normalizeSubjectName(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(String(item).trim());
  }
  return result;
}

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

function TeacherToolHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color={TEACHER.text} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.headerIcon}>
        <Ionicons name="sparkles" size={20} color={TEACHER.primaryLight} />
      </View>
    </View>
  );
}

export default function TeacherToolPage() {
  const { toolType: rawToolType } = useLocalSearchParams<{ toolType: string }>();
  const toolType = rawToolType || '';
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [assignedSubjectNames, setAssignedSubjectNames] = useState<string[]>([]);
  const [availableNCERTTopics, setAvailableNCERTTopics] = useState<string[]>([]);
  const [schoolBoardName, setSchoolBoardName] = useState('CBSE');
  const [isAsliPrepExclusive, setIsAsliPrepExclusive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownState | null>(null);

  const config = toolType && isTeacherToolType(toolType) ? getTeacherToolConfig(toolType) : null;
  const accent = config?.color || TEACHER.primary;

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

  const restrictToAssignedSubjects = useCallback(
    (subjects: string[]) => {
      if (assignedSubjectNames.length === 0) return subjects;
      const allowed = new Set(assignedSubjectNames.map(normalizeSubjectName));
      const restricted = uniquePreserveOrder(
        subjects.filter((subject) => allowed.has(normalizeSubjectName(subject)))
      );
      return restricted.length > 0 ? restricted : subjects;
    },
    [assignedSubjectNames]
  );

  const availableSubjects = useMemo(() => {
    const gv = formParams.gradeLevel;
    if (!gv || !isGradeWithScienceCurriculumDropdowns(gv)) return [];
    const raw = cascade.subjects;
    if (cascade.loadingSubjects && raw.length === 0) return [];
    if (raw.length === 0) return [];
    return restrictToAssignedSubjects(raw);
  }, [
    formParams.gradeLevel,
    cascade.subjects,
    cascade.loadingSubjects,
    restrictToAssignedSubjects,
  ]);

  const subjectsForTool = useMemo(
    () => filterSubjectsForAiTool(toolType, availableSubjects),
    [toolType, availableSubjects]
  );

  const displayGeneratedContent = useMemo(
    () => stripStructuredAiToolMetadata(generatedContent),
    [generatedContent]
  );

  const { curriculumFields, topicFields, extraFields } = useMemo(() => {
    if (!config) return { curriculumFields: [], topicFields: [], extraFields: [] };
    const curriculum: TeacherToolFieldConfig[] = [];
    const topic: TeacherToolFieldConfig[] = [];
    const extra: TeacherToolFieldConfig[] = [];
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

  useBackNavigation('/teacher/dashboard', false);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await teacherService.me();
        const user = meRes.data?.user ?? meRes.data ?? meRes.user;
        const exclusive = resolveIsAsliPrepExclusive(user);
        setIsAsliPrepExclusive(exclusive);
        const curriculumBoard = resolveCurriculumBoardForAiTools(user);
        const defaultBoard = getDefaultAiToolBoard(exclusive, curriculumBoard);
        setSchoolBoardName(curriculumBoard);
        setFormParams((prev) => ({
          ...prev,
          board: prev.board || defaultBoard,
        }));
      } catch (error) {
        console.error('Failed to fetch teacher profile:', error);
      } finally {
        setIsLoadingUser(false);
      }

      try {
        const subsRes = await teacherService.subjects();
        const rows = asArray<any>(subsRes.data ?? subsRes);
        const names = rows
          .map((subj: any) => String(subj?.name || subj?.displayName || '').trim())
          .filter(Boolean);
        setAssignedSubjectNames(uniquePreserveOrder(names));
      } catch (error) {
        console.error('Failed to fetch teacher assigned subjects:', error);
      }
    })();
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
    if (!isStoryLanguageTool(toolType)) return;
    const sub = formParams.subject;
    if (!sub || isStoryPassageLanguageSubject(sub)) return;
    setFormParams((prev) => {
      const next = { ...prev };
      delete next.subject;
      delete next.topic;
      delete next.subTopic;
      return next;
    });
  }, [toolType, formParams.subject]);

  useEffect(() => {
    if (!formParams.gradeLevel || subjectsForTool.length === 0) return;
    setFormParams((prev) => {
      const currentSubject = prev.subject;
      const hasCurrent =
        currentSubject &&
        subjectsForTool.some(
          (s) => normalizeSubjectName(s) === normalizeSubjectName(String(currentSubject))
        );
      if (hasCurrent) return prev;
      return { ...prev, subject: subjectsForTool[0] };
    });
  }, [subjectsForTool, formParams.gradeLevel]);

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
    (field: TeacherToolFieldConfig): string[] => {
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

      return [];
    },
    [formParams, subjectsForTool, cascade.subtopics, availableNCERTTopics]
  );

  const getFieldDisabledState = (field: TeacherToolFieldConfig) => {
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

    return { isDisabled, loading };
  };

  const getPlaceholderHint = (
    field: TeacherToolFieldConfig,
    fieldOptions: string[],
    isDisabled: boolean
  ) => {
    if (!isDisabled) return field.placeholder || `Select ${field.label.replace(' *', '')}`;

    if (field.name === 'gradeLevel' && cascade.loadingClasses) return 'Loading classes...';
    if (field.name === 'subject') {
      if (!formParams.gradeLevel || cascade.loadingSubjects) return 'Select class first';
      if (subjectsForTool.length === 0) {
        return isStoryLanguageTool(toolType) ? 'English or Hindi only' : 'No subjects available';
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
    if (!config || !toolType) return;

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

    if (
      toolType === 'story-passage-creator' &&
      !isStoryPassageLanguageSubject(String(formParams.subject || ''))
    ) {
      Alert.alert(
        'English or Hindi only',
        'Story & Passage Creator works only with English or Hindi subjects.'
      );
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const selectedClass = mapGradeLevelForIitBoard(selectedBoard, formParams.gradeLevel);
      const selectedSubject = formParams.subject || formParams.subjects;
      const selectedTopic = formParams.topic || '';
      const selectedSubTopic = formParams.subTopic || '';
      const selectedSection = formParams.section || formParams.className || '';

      const requestBody: Record<string, unknown> = {
        toolType,
        classNumber: selectedClass
          ? selectedClass === 'IIT-6' || selectedClass === 'Class-6-IIT'
            ? 'IIT-6'
            : parseInt(String(selectedClass).replace('Class ', ''), 10)
          : undefined,
        subject: selectedSubject,
        topic: selectedTopic,
        subTopic: selectedSubTopic,
        section: selectedSection,
        questionCount: formParams.questionCount ? parseInt(formParams.questionCount, 10) : undefined,
        duration: formParams.duration ? parseInt(formParams.duration, 10) : undefined,
        ...formParams,
        board: selectedBoard,
        gradeLevel: selectedClass,
      };

      const data = await teacherService.generateAiToolContent(
        requestBody as Record<string, unknown> & { toolType: string }
      );

      if (data.success) {
        const content = data.data?.content || data.content || '';
        setGeneratedContent(content || 'No content generated.');
      } else {
        throw new Error(data.message || 'Failed to generate content');
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
      await Clipboard.setStringAsync(displayGeneratedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: displayGeneratedContent, title: config?.name });
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
          <View style={[styles.fieldIconWrap, { backgroundColor: `${accent}22` }]}>
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
          <Ionicons name="chevron-down" size={18} color={disabled ? TEACHER.navInactive : TEACHER.textMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSelectField = (field: TeacherToolFieldConfig) => {
    const value = formParams[field.name] || '';
    const { isDisabled, loading } = getFieldDisabledState(field);

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

  const renderField = (field: TeacherToolFieldConfig) => {
    const value = formParams[field.name] || '';

    if (field.type === 'select') return renderSelectField(field);

    if (field.type === 'textarea') {
      return (
        <View key={field.name} style={styles.fieldBlock}>
          <View style={styles.labelRow}>
            <View style={[styles.fieldIconWrap, { backgroundColor: `${accent}22` }]}>
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
            placeholderTextColor={TEACHER.navInactive}
          />
        </View>
      );
    }

    return (
      <View key={field.name} style={styles.fieldBlock}>
        <View style={styles.labelRow}>
          <View style={[styles.fieldIconWrap, { backgroundColor: `${accent}22` }]}>
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
          placeholderTextColor={TEACHER.navInactive}
        />
      </View>
    );
  };

  if (!config) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <TeacherToolHeader title="Tool not found" onBack={() => router.back()} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={TEACHER.danger} />
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

  const wordCount = displayGeneratedContent.trim()
    ? displayGeneratedContent.trim().split(/\s+/).length
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <TeacherToolHeader
        title={config.name}
        subtitle={config.description}
        onBack={() => router.back()}
      />

      <View style={styles.toolMeta}>
        <View style={[styles.heroIconWrap, { backgroundColor: `${accent}22` }]}>
          <Ionicons name={config.icon} size={24} color={accent} />
        </View>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={12} color={TEACHER.primaryLight} />
          <Text style={styles.aiBadgeText}>Vidya AI</Text>
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
          <View style={[styles.progressFill, { width: `${completion.percent}%`, backgroundColor: accent }]} />
        </View>
      </View>

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
            {isStoryLanguageTool(toolType) ? (
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={18} color={TEACHER.primaryLight} />
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

          {displayGeneratedContent ? (
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
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color={copied ? TEACHER.primaryLight : accent}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resultActionBtn} onPress={handleShare}>
                    <Ionicons name="share-outline" size={18} color={accent} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.resultDivider} />
              <Text style={styles.resultText} selectable>
                {displayGeneratedContent}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyResult}>
              <Ionicons name="document-text-outline" size={32} color={TEACHER.navInactive} />
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
                  <ActivityIndicator size="small" color={TEACHER.textOnPrimary} />
                  <Text style={styles.generateBtnText}>Generating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color={TEACHER.textOnPrimary} />
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
  container: { flex: 1, backgroundColor: TEACHER.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.md,
    gap: TEACHER_SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: TEACHER_RADIUS.md,
    backgroundColor: TEACHER.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { ...TEACHER_TYPO.section, fontSize: 18, color: TEACHER.text },
  headerSubtitle: { ...TEACHER_TYPO.caption, color: TEACHER.textMuted, marginTop: 2 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: TEACHER_RADIUS.md,
    backgroundColor: TEACHER.navActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TEACHER_SPACING.xl,
    paddingTop: TEACHER_SPACING.sm,
    paddingBottom: TEACHER_SPACING.sm,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: TEACHER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TEACHER.navActiveBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: TEACHER_RADIUS.full,
  },
  aiBadgeText: { ...TEACHER_TYPO.label, color: TEACHER.primaryLight },
  progressWrap: {
    paddingHorizontal: TEACHER_SPACING.xl,
    paddingBottom: TEACHER_SPACING.lg,
  },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: TEACHER_SPACING.sm },
  progressLabel: { ...TEACHER_TYPO.caption, color: TEACHER.textMuted },
  progressValue: { ...TEACHER_TYPO.caption, color: TEACHER.text, fontWeight: '700' },
  progressTrack: {
    height: 6,
    borderRadius: TEACHER_RADIUS.full,
    backgroundColor: TEACHER.surfaceBorder,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: TEACHER_RADIUS.full },
  scroll: { flex: 1 },
  scrollContent: { padding: TEACHER_SPACING.lg, gap: 14 },
  sectionCard: {
    backgroundColor: TEACHER.surface,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  sectionAccent: { width: 4 },
  sectionHeaderText: { flex: 1, paddingHorizontal: TEACHER_SPACING.lg, paddingVertical: 14 },
  sectionTitle: { ...TEACHER_TYPO.body, fontWeight: '800', color: TEACHER.text },
  sectionSubtitle: { ...TEACHER_TYPO.caption, color: TEACHER.textMuted, marginTop: 2 },
  sectionBody: { padding: TEACHER_SPACING.lg, gap: 14 },
  fieldBlock: { gap: TEACHER_SPACING.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: TEACHER_SPACING.sm },
  fieldIconWrap: {
    width: 28,
    height: 28,
    borderRadius: TEACHER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: { flex: 1, ...TEACHER_TYPO.body, fontWeight: '700', color: TEACHER.textSecondary },
  fieldSpinner: { marginLeft: 'auto' },
  required: { color: TEACHER.danger },
  dropdownTrigger: {
    minHeight: 52,
    borderRadius: TEACHER_RADIUS.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surfaceHover,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dropdownTriggerDisabled: { opacity: 0.55, backgroundColor: TEACHER.surface },
  dropdownValue: { flex: 1, ...TEACHER_TYPO.body, fontWeight: '600', color: TEACHER.text },
  dropdownPlaceholder: { color: TEACHER.navInactive, fontWeight: '500' },
  textInput: {
    minHeight: 52,
    borderRadius: TEACHER_RADIUS.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surfaceHover,
    paddingHorizontal: 14,
    fontSize: 15,
    color: TEACHER.text,
  },
  textArea: { minHeight: 110, paddingTop: 14, paddingBottom: 14 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.sm,
    backgroundColor: TEACHER.navActiveBg,
    borderRadius: TEACHER_RADIUS.md,
    padding: TEACHER_SPACING.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  infoBannerText: { flex: 1, ...TEACHER_TYPO.caption, color: TEACHER.primaryLight, lineHeight: 18 },
  emptyResult: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: TEACHER_SPACING.xxl,
    backgroundColor: TEACHER.surface,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderStyle: 'dashed',
  },
  emptyResultTitle: {
    marginTop: TEACHER_SPACING.md,
    ...TEACHER_TYPO.body,
    fontWeight: '700',
    color: TEACHER.textMuted,
  },
  emptyResultText: {
    marginTop: 4,
    ...TEACHER_TYPO.caption,
    color: TEACHER.navInactive,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: TEACHER.surfaceElevated,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    padding: TEACHER_SPACING.lg,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resultTitle: { ...TEACHER_TYPO.body, fontWeight: '800', color: TEACHER.text },
  resultMeta: { ...TEACHER_TYPO.caption, color: TEACHER.textMuted, marginTop: 2 },
  resultActions: { flexDirection: 'row', gap: TEACHER_SPACING.sm },
  resultActionBtn: {
    width: 40,
    height: 40,
    borderRadius: TEACHER_RADIUS.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEACHER.surface,
  },
  resultActionBtnActive: { borderColor: TEACHER.primaryLight, backgroundColor: TEACHER.navActiveBg },
  resultDivider: { height: 1, backgroundColor: TEACHER.surfaceBorder, marginVertical: 14 },
  resultText: { ...TEACHER_TYPO.body, color: TEACHER.textSecondary, lineHeight: 24 },
  footer: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: 10,
    paddingBottom: TEACHER_SPACING.md,
    backgroundColor: TEACHER.bg,
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
  },
  generateBtn: { borderRadius: TEACHER_RADIUS.lg, overflow: 'hidden' },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: TEACHER_SPACING.sm,
    paddingVertical: TEACHER_SPACING.lg,
  },
  generateBtnText: { fontSize: 16, fontWeight: '800', color: TEACHER.textOnPrimary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: TEACHER.bg,
    borderTopLeftRadius: TEACHER_RADIUS.xl,
    borderTopRightRadius: TEACHER_RADIUS.xl,
    maxHeight: '70%',
    paddingBottom: TEACHER_SPACING.xl,
    borderTopWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: TEACHER_RADIUS.full,
    backgroundColor: TEACHER.navInactive,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: TEACHER_SPACING.md,
  },
  modalTitle: {
    ...TEACHER_TYPO.section,
    fontSize: 18,
    color: TEACHER.text,
    paddingHorizontal: TEACHER_SPACING.xl,
    marginBottom: TEACHER_SPACING.sm,
  },
  modalList: { maxHeight: 360 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TEACHER_SPACING.xl,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  modalItemSelected: { backgroundColor: TEACHER.surfaceHover },
  modalItemText: {
    fontSize: 16,
    color: TEACHER.textSecondary,
    flex: 1,
    paddingRight: TEACHER_SPACING.md,
  },
  modalItemTextSelected: { fontWeight: '700', color: TEACHER.text },
  modalCloseBtn: {
    marginHorizontal: TEACHER_SPACING.xl,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: TEACHER_RADIUS.md,
    backgroundColor: TEACHER.surface,
    alignItems: 'center',
  },
  modalCloseText: { ...TEACHER_TYPO.body, fontWeight: '700', color: TEACHER.textSecondary },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: TEACHER_SPACING.xxxl,
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: TEACHER.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TEACHER_SPACING.lg,
  },
  errorTitle: { ...TEACHER_TYPO.section, fontSize: 20, color: TEACHER.text },
  errorSubtitle: {
    ...TEACHER_TYPO.caption,
    color: TEACHER.textMuted,
    marginTop: TEACHER_SPACING.sm,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: TEACHER_SPACING.xxl,
    backgroundColor: TEACHER.primary,
    paddingHorizontal: TEACHER_SPACING.xxl,
    paddingVertical: TEACHER_SPACING.md,
    borderRadius: TEACHER_RADIUS.md,
  },
  errorButtonText: { color: TEACHER.textOnPrimary, ...TEACHER_TYPO.body, fontWeight: '700' },
});

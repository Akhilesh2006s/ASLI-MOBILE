import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SubNavChips } from '../../../src/components/teacher';
import { TEACHER } from '../../../src/theme/teacher';
import TeacherAssessmentsView from './AssessmentsView';
import TeacherVideosView from './VideosView';
import HomeworkCreatorView from './HomeworkCreatorView';
import QuizzesView from './QuizzesView';

type ContentSubTab = 'assessments' | 'videos' | 'homework' | 'quizzes';

const SUB_TABS = [
  { id: 'assessments', label: 'Assessments' },
  { id: 'videos', label: 'Videos' },
  { id: 'homework', label: 'Homework' },
  { id: 'quizzes', label: 'Quizzes' },
];

type Props = { initialSubTab?: ContentSubTab };

export default function ContentView({ initialSubTab }: Props) {
  const [subTab, setSubTab] = useState<ContentSubTab>(initialSubTab || 'assessments');

  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  return (
    <View style={{ flex: 1, backgroundColor: TEACHER.bg }}>
      <SubNavChips items={SUB_TABS} active={subTab} onChange={(id) => setSubTab(id as ContentSubTab)} />
      {subTab === 'assessments' && <TeacherAssessmentsView />}
      {subTab === 'videos' && <TeacherVideosView />}
      {subTab === 'homework' && <HomeworkCreatorView />}
      {subTab === 'quizzes' && <QuizzesView />}
    </View>
  );
}

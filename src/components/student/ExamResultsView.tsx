import DetailedAnalysisView from '../../../app/dashboard/_components/DetailedAnalysisView';
import { ExamAnalysisResult } from '../../lib/exam-analysis-helpers';

type Props = {
  result: ExamAnalysisResult;
  examTitle: string;
  onBack: () => void;
  onRetake?: () => void;
  attemptsRemaining?: number;
};

/** Routes directly to the full exam analysis (no summary screen). */
export default function ExamResultsView({
  result,
  examTitle,
  onBack,
  onRetake,
  attemptsRemaining = 0,
}: Props) {
  return (
    <DetailedAnalysisView
      result={result}
      examTitle={examTitle}
      onBack={onBack}
      onRetake={onRetake}
      attemptsRemaining={attemptsRemaining}
    />
  );
}
